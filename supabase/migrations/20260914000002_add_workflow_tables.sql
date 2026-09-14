-- =============================================================================
-- Milestone 3: Workflow Alignment Schema Migration
-- Adds source reference, objective, production detail, review status,
-- date precision flag, format 'photo', and new tables:
-- content_links, production_tasks, reference_accounts.
-- =============================================================================

-- 1. Extend content_items
alter table public.content_items
  add column if not exists source_number integer null,
  add column if not exists objective text null,
  add column if not exists production_detail text null,
  add column if not exists review_status text null,
  add column if not exists source_content_status text null,
  add column if not exists publish_time_known boolean not null default true;

-- Update format constraint to allow 'photo'
alter table public.content_items drop constraint if exists content_items_format_check;
alter table public.content_items add constraint content_items_format_check
  check (format is null or format in ('short', 'carousel', 'long', 'infographic', 'story', 'photo'));

-- Add review_status constraint
alter table public.content_items drop constraint if exists content_items_review_status_check;
alter table public.content_items add constraint content_items_review_status_check
  check (review_status is null or review_status in ('in_process', 'revise', 'approved'));

-- Unique source_number per user (partial index)
create unique index if not exists content_items_user_source_number_idx
  on public.content_items (user_id, source_number)
  where source_number is not null;

-- 2. Create content_links table
create table if not exists public.content_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  link_type text not null check (link_type in ('idea_source', 'asset', 'published', 'note')),
  platform text null check (platform is null or platform in ('tiktok', 'instagram', 'youtube', 'facebook', 'x')),
  url text not null,
  label text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint content_links_item_fk foreign key (content_item_id, user_id)
    references public.content_items (id, user_id) on delete cascade
);

create index if not exists content_links_user_item_idx
  on public.content_links (user_id, content_item_id);

-- Enable RLS for content_links
alter table public.content_links enable row level security;

create policy "content_links_select_owner" on public.content_links
  for select using (auth.uid() = user_id);

create policy "content_links_insert_owner" on public.content_links
  for insert with check (auth.uid() = user_id);

create policy "content_links_update_owner" on public.content_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "content_links_delete_owner" on public.content_links
  for delete using (auth.uid() = user_id);

revoke all on table public.content_links from public, anon;
grant select, insert, update, delete on table public.content_links to authenticated;

-- 3. Create production_tasks table
create table if not exists public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid null references public.content_items(id) on delete set null,
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  due_date date null,
  priority text null check (priority is null or priority in ('low', 'medium', 'high')),
  task_type text null check (task_type is null or task_type in ('video', 'photo', 'post', 'other')),
  description text null,
  import_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_tasks_item_fk foreign key (content_item_id, user_id)
    references public.content_items (id, user_id) on delete set null (content_item_id)
);

create index if not exists production_tasks_user_status_idx
  on public.production_tasks (user_id, status);

create index if not exists production_tasks_user_due_date_idx
  on public.production_tasks (user_id, due_date);

create unique index if not exists production_tasks_user_import_key_idx
  on public.production_tasks (user_id, import_key)
  where import_key is not null;

create trigger tr_production_tasks_updated_at
  before update on public.production_tasks
  for each row execute function public.handle_updated_at();

-- Enable RLS for production_tasks
alter table public.production_tasks enable row level security;

create policy "production_tasks_select_owner" on public.production_tasks
  for select using (auth.uid() = user_id);

create policy "production_tasks_insert_owner" on public.production_tasks
  for insert with check (auth.uid() = user_id);

create policy "production_tasks_update_owner" on public.production_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "production_tasks_delete_owner" on public.production_tasks
  for delete using (auth.uid() = user_id);

revoke all on table public.production_tasks from public, anon;
grant select, insert, update, delete on table public.production_tasks to authenticated;

-- 4. Create reference_accounts table
create table if not exists public.reference_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'tiktok' check (platform in ('tiktok', 'instagram', 'youtube', 'facebook', 'x')),
  account_label text not null,
  url text not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reference_accounts_user_platform_url_idx
  on public.reference_accounts (user_id, platform, url);

create trigger tr_reference_accounts_updated_at
  before update on public.reference_accounts
  for each row execute function public.handle_updated_at();

-- Enable RLS for reference_accounts
alter table public.reference_accounts enable row level security;

create policy "reference_accounts_select_owner" on public.reference_accounts
  for select using (auth.uid() = user_id);

create policy "reference_accounts_insert_owner" on public.reference_accounts
  for insert with check (auth.uid() = user_id);

create policy "reference_accounts_update_owner" on public.reference_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reference_accounts_delete_owner" on public.reference_accounts
  for delete using (auth.uid() = user_id);

revoke all on table public.reference_accounts from public, anon;
grant select, insert, update, delete on table public.reference_accounts to authenticated;


-- 5. Atomic content item & links transactional mutation function
create or replace function public.upsert_content_item_with_links(
  p_item jsonb,
  p_links jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_item_id uuid;
  v_title text;
  v_status text;
  v_platforms text[];
  v_format text;
  v_goal text;
  v_hook text;
  v_objective text;
  v_production_detail text;
  v_cta text;
  v_caption text;
  v_hashtags text[];
  v_notes text;
  v_progress integer;
  v_publish_at timestamptz;
  v_publish_time_known boolean;
  v_review_status text;
  v_source_content_status text;
  v_pillar_id uuid;
  v_source_number integer;
  v_link jsonb;
  v_elem text;
  v_sort_order integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthorized: authentication required' using errcode = '42501';
  end if;

  -- 1. Validate parameter shapes
  if p_item is null or jsonb_typeof(p_item) is distinct from 'object' then
    raise exception 'validation_failed: p_item must be a json object' using errcode = '22023';
  end if;

  if p_links is not null and jsonb_typeof(p_links) is distinct from 'array' then
    raise exception 'validation_failed: p_links must be null or a json array' using errcode = '22023';
  end if;

  -- 2. Validate complete links payload before touching any database row
  if p_links is not null and jsonb_typeof(p_links) = 'array' then
    for v_link in select * from jsonb_array_elements(p_links) loop
      if jsonb_typeof(v_link) is distinct from 'object' then
        raise exception 'validation_failed: each link must be a json object' using errcode = '22023';
      end if;
      if v_link->>'link_type' is null or v_link->>'link_type' not in ('idea_source', 'asset', 'published', 'note') then
        raise exception 'validation_failed: invalid link_type %', v_link->>'link_type' using errcode = '22023';
      end if;
      if nullif(trim(v_link->>'url'), '') is null then
        raise exception 'validation_failed: url is required for link' using errcode = '22023';
      end if;
      if not (v_link->>'url' ~* '^https?://.+') then
        raise exception 'validation_failed: link url must start with http:// or https://' using errcode = '22023';
      end if;
      if length(v_link->>'url') > 2048 then
        raise exception 'validation_failed: link url exceeds 2048 characters' using errcode = '22023';
      end if;
      if v_link->>'label' is not null and length(v_link->>'label') > 255 then
        raise exception 'validation_failed: link label exceeds 255 characters' using errcode = '22023';
      end if;
      if v_link->>'platform' is not null and nullif(trim(v_link->>'platform'), '') is not null then
        if v_link->>'platform' not in ('tiktok', 'instagram', 'youtube', 'facebook', 'x') then
          raise exception 'validation_failed: invalid link platform %', v_link->>'platform' using errcode = '22023';
        end if;
      end if;
      if v_link->>'sort_order' is not null and nullif(trim(v_link->>'sort_order'), '') is not null then
        begin
          v_sort_order := (v_link->>'sort_order')::integer;
        exception when others then
          raise exception 'validation_failed: sort_order must be an integer' using errcode = '22023';
        end;
        if v_sort_order < 0 or v_sort_order > 10000 then
          raise exception 'validation_failed: sort_order must be between 0 and 10000' using errcode = '22023';
        end if;
      end if;
    end loop;
  end if;

  -- 3. Validate and extract title
  if p_item ? 'title' then
    v_title := trim(p_item->>'title');
    if v_title is null or length(v_title) = 0 then
      raise exception 'validation_failed: title is required' using errcode = '22023';
    end if;
    if length(v_title) > 500 then
      raise exception 'validation_failed: title exceeds 500 characters' using errcode = '22023';
    end if;
  else
    if (p_item->>'id') is null then
      raise exception 'validation_failed: title is required' using errcode = '22023';
    end if;
    v_title := null;
  end if;

  -- 4. Validate and extract status
  if p_item ? 'status' then
    v_status := p_item->>'status';
    if v_status is null or v_status not in ('idea', 'researching', 'scripting', 'recording', 'editing', 'reviewing', 'scheduled', 'published') then
      raise exception 'validation_failed: invalid status' using errcode = '22023';
    end if;
  else
    if (p_item->>'id') is null then
      v_status := 'idea'; -- Default status only when omitted on creation
    else
      v_status := null;
    end if;
  end if;

  -- 5. Platforms validation (no silent defaulting to tiktok)
  if p_item ? 'platforms' then
    if jsonb_typeof(p_item->'platforms') is distinct from 'array' then
      raise exception 'validation_failed: platforms must be a json array' using errcode = '22023';
    end if;
    if jsonb_array_length(p_item->'platforms') = 0 then
      raise exception 'validation_failed: platforms array cannot be empty' using errcode = '22023';
    end if;
    for v_elem in select * from jsonb_array_elements_text(p_item->'platforms') loop
      if v_elem not in ('tiktok', 'instagram', 'youtube', 'facebook', 'x') then
        raise exception 'validation_failed: invalid platform %', v_elem using errcode = '22023';
      end if;
    end loop;
    select array_agg(elem::text) into v_platforms
    from jsonb_array_elements_text(p_item->'platforms') elem;
  else
    if (p_item->>'id') is null then
      raise exception 'validation_failed: platforms is required for new content item' using errcode = '22023';
    end if;
    v_platforms := null;
  end if;

  v_format := nullif(trim(p_item->>'format'), '');
  if v_format is not null and v_format not in ('short', 'carousel', 'long', 'infographic', 'story', 'photo') then
    raise exception 'validation_failed: invalid format' using errcode = '22023';
  end if;

  v_goal := nullif(trim(p_item->>'goal'), '');
  if v_goal is not null and v_goal not in ('awareness', 'engagement', 'growth', 'leads', 'conversion') then
    raise exception 'validation_failed: invalid goal' using errcode = '22023';
  end if;

  v_hook := nullif(trim(p_item->>'hook'), '');
  v_objective := nullif(trim(p_item->>'objective'), '');
  v_production_detail := nullif(trim(p_item->>'production_detail'), '');
  v_cta := nullif(trim(p_item->>'cta'), '');
  v_caption := nullif(trim(p_item->>'caption'), '');
  v_notes := nullif(trim(p_item->>'notes'), '');

  if p_item ? 'hashtags' and jsonb_typeof(p_item->'hashtags') = 'array' then
    select coalesce(array_agg(elem::text), array[]::text[]) into v_hashtags
    from jsonb_array_elements_text(p_item->'hashtags') elem;
    v_hashtags := coalesce(v_hashtags, array[]::text[]);
  else
    v_hashtags := null;
  end if;

  if p_item ? 'progress' then
    v_progress := coalesce((p_item->>'progress')::integer, 0);
    if v_progress < 0 or v_progress > 100 then
      raise exception 'validation_failed: progress must be between 0 and 100' using errcode = '22023';
    end if;
  else
    v_progress := null;
  end if;

  if (p_item->>'publish_at') is not null and (p_item->>'publish_at') <> '' then
    v_publish_at := (p_item->>'publish_at')::timestamptz;
  else
    v_publish_at := null;
  end if;

  if p_item ? 'publish_time_known' then
    v_publish_time_known := (p_item->>'publish_time_known')::boolean;
  else
    v_publish_time_known := null;
  end if;

  v_review_status := nullif(trim(p_item->>'review_status'), '');
  if v_review_status is not null and v_review_status not in ('in_process', 'revise', 'approved') then
    raise exception 'validation_failed: invalid review_status' using errcode = '22023';
  end if;

  v_source_content_status := nullif(trim(p_item->>'source_content_status'), '');

  if (p_item->>'content_pillar_id') is not null and (p_item->>'content_pillar_id') <> '' then
    v_pillar_id := (p_item->>'content_pillar_id')::uuid;
  else
    v_pillar_id := null;
  end if;

  if (p_item->>'source_number') is not null and (p_item->>'source_number') <> '' then
    v_source_number := (p_item->>'source_number')::integer;
  else
    v_source_number := null;
  end if;

  if (p_item->>'id') is not null and (p_item->>'id') <> '' then
    v_item_id := (p_item->>'id')::uuid;
    -- Update existing row scoped to auth.uid()
    update public.content_items
    set
      title = coalesce(v_title, title),
      status = coalesce(v_status, status),
      platforms = coalesce(v_platforms, platforms),
      format = case when p_item ? 'format' then v_format else format end,
      goal = case when p_item ? 'goal' then v_goal else goal end,
      hook = case when p_item ? 'hook' then v_hook else hook end,
      objective = case when p_item ? 'objective' then v_objective else objective end,
      production_detail = case when p_item ? 'production_detail' then v_production_detail else production_detail end,
      cta = case when p_item ? 'cta' then v_cta else cta end,
      caption = case when p_item ? 'caption' then v_caption else caption end,
      hashtags = case when p_item ? 'hashtags' then coalesce(v_hashtags, array[]::text[]) else hashtags end,
      notes = case when p_item ? 'notes' then v_notes else notes end,
      progress = coalesce(v_progress, progress),
      publish_at = case when p_item ? 'publish_at' then v_publish_at else publish_at end,
      publish_time_known = coalesce(v_publish_time_known, publish_time_known),
      review_status = case when p_item ? 'review_status' then v_review_status else review_status end,
      source_content_status = case when p_item ? 'source_content_status' then v_source_content_status else source_content_status end,
      content_pillar_id = case when p_item ? 'content_pillar_id' then v_pillar_id else content_pillar_id end,
      source_number = coalesce(v_source_number, source_number)
    where id = v_item_id and user_id = v_user_id;

    if not found then
      raise exception 'item_not_found: content item does not exist or not owned' using errcode = 'P0002';
    end if;
  else
    -- Insert new row
    insert into public.content_items (
      user_id,
      title,
      status,
      platforms,
      format,
      goal,
      hook,
      objective,
      production_detail,
      cta,
      caption,
      hashtags,
      notes,
      progress,
      publish_at,
      publish_time_known,
      review_status,
      source_content_status,
      content_pillar_id,
      source_number
    ) values (
      v_user_id,
      v_title,
      v_status,
      v_platforms,
      v_format,
      v_goal,
      v_hook,
      v_objective,
      v_production_detail,
      v_cta,
      v_caption,
      coalesce(v_hashtags, array[]::text[]),
      v_notes,
      coalesce(v_progress, 0),
      v_publish_at,
      coalesce(v_publish_time_known, true),
      v_review_status,
      v_source_content_status,
      v_pillar_id,
      v_source_number
    )
    returning id into v_item_id;
  end if;

  -- Atomic link reconciliation only if p_links is provided
  if p_links is not null and jsonb_typeof(p_links) = 'array' then
    delete from public.content_links
    where content_item_id = v_item_id and user_id = v_user_id;

    for v_link in select * from jsonb_array_elements(p_links) loop
      insert into public.content_links (
        user_id,
        content_item_id,
        link_type,
        platform,
        url,
        label,
        sort_order
      ) values (
        v_user_id,
        v_item_id,
        v_link->>'link_type',
        nullif(v_link->>'platform', ''),
        v_link->>'url',
        nullif(v_link->>'label', ''),
        coalesce((v_link->>'sort_order')::integer, 0)
      );
    end loop;
  end if;

  return v_item_id;
end;
$$;

revoke execute on function public.upsert_content_item_with_links(jsonb, jsonb) from public, anon;
grant execute on function public.upsert_content_item_with_links(jsonb, jsonb) to authenticated;
