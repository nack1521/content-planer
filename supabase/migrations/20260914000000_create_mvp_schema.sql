-- ==============================================================================
-- Content Planner MVP Database Schema Migration
-- ==============================================================================

-- 1. Timestamp Trigger Function with explicit search_path
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- 2. User Preferences Table
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'th' check (locale in ('th', 'en')),
  timezone text not null default 'Asia/Bangkok',
  default_platforms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.handle_updated_at();

-- 3. Content Pillars Table
create table if not exists public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name_en text not null,
  name_th text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_pillars_id_user_id_uq unique (id, user_id)
);

alter table public.content_pillars enable row level security;

create unique index if not exists content_pillars_user_name_en_idx
  on public.content_pillars (user_id, lower(name_en));

create index if not exists content_pillars_user_sort_idx
  on public.content_pillars (user_id, sort_order);

create trigger set_content_pillars_updated_at
  before update on public.content_pillars
  for each row execute function public.handle_updated_at();

-- 4. Content Items Table
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platforms text[] not null default '{}',
  content_pillar_id uuid null,
  format text null check (format is null or format in ('short', 'carousel', 'long', 'infographic', 'story')),
  goal text null check (goal is null or goal in ('awareness', 'engagement', 'growth', 'leads', 'conversion')),
  status text not null default 'idea' check (
    status in (
      'idea',
      'researching',
      'scripting',
      'recording',
      'editing',
      'reviewing',
      'scheduled',
      'published'
    )
  ),
  progress smallint not null default 0 check (progress >= 0 and progress <= 100),
  publish_at timestamptz null,
  hook text null,
  caption text null,
  cta text null,
  hashtags text[] not null default '{}',
  notes text null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_id_user_id_uq unique (id, user_id),
  constraint content_items_pillar_fk foreign key (content_pillar_id, user_id)
    references public.content_pillars (id, user_id) on delete set null (content_pillar_id)
);

alter table public.content_items enable row level security;

create index if not exists content_items_user_publish_at_idx
  on public.content_items (user_id, publish_at);

create index if not exists content_items_user_status_idx
  on public.content_items (user_id, status);

create index if not exists content_items_user_archived_at_idx
  on public.content_items (user_id, archived_at);

create trigger set_content_items_updated_at
  before update on public.content_items
  for each row execute function public.handle_updated_at();

-- 5. Content Media Table
create table if not exists public.content_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint content_media_item_fk foreign key (content_item_id, user_id)
    references public.content_items (id, user_id) on delete cascade
);

alter table public.content_media enable row level security;

create index if not exists content_media_user_item_idx
  on public.content_media (user_id, content_item_id);

-- 6. Row Level Security Policies (Owner Scoped auth.uid() = user_id)

-- User Preferences Policies
create policy "Owner can select their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Owner can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Owner can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete their own preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- Content Pillars Policies
create policy "Owner can select their own content pillars"
  on public.content_pillars for select
  using (auth.uid() = user_id);

create policy "Owner can insert their own content pillars"
  on public.content_pillars for insert
  with check (auth.uid() = user_id);

create policy "Owner can update their own content pillars"
  on public.content_pillars for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete their own content pillars"
  on public.content_pillars for delete
  using (auth.uid() = user_id);

-- Content Items Policies (with parent pillar ownership check on insert and update)
create policy "Owner can select their own content items"
  on public.content_items for select
  using (auth.uid() = user_id);

create policy "Owner can insert their own content items"
  on public.content_items for insert
  with check (
    auth.uid() = user_id and
    (
      content_pillar_id is null or
      exists (
        select 1 from public.content_pillars
        where id = content_pillar_id and user_id = auth.uid()
      )
    )
  );

create policy "Owner can update their own content items"
  on public.content_items for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and
    (
      content_pillar_id is null or
      exists (
        select 1 from public.content_pillars
        where id = content_pillar_id and user_id = auth.uid()
      )
    )
  );

create policy "Owner can delete their own content items"
  on public.content_items for delete
  using (auth.uid() = user_id);

-- Content Media Policies (with parent content item ownership check on insert and update)
create policy "Owner can select their own content media"
  on public.content_media for select
  using (auth.uid() = user_id);

create policy "Owner can insert their own content media"
  on public.content_media for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.content_items
      where id = content_item_id and user_id = auth.uid()
    )
  );

create policy "Owner can update their own content media"
  on public.content_media for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.content_items
      where id = content_item_id and user_id = auth.uid()
    )
  );

create policy "Owner can delete their own content media"
  on public.content_media for delete
  using (auth.uid() = user_id);

-- 7. Explicit Role Grants and Permissions
revoke all on all tables in schema public from anon, public;
revoke all on all functions in schema public from anon, public;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.user_preferences,
  public.content_pillars,
  public.content_items,
  public.content_media
to authenticated;
