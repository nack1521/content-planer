-- =============================================================================
-- Migration: 20260914000003_add_controlled_batch_import.sql
-- Purpose: Genuine single-transaction atomic batch import for multiple owners.
-- Guarantees:
-- 1. Atomic all-or-nothing execution across all target owners and all tables
--    (content_items, content_links, production_tasks, reference_accounts, content_pillars).
-- 2. Safe reruns: preserves website user edits, extra links, and link IDs by default;
--    only overwrites when explicit allow_overwrite parameter is true.
-- 3. In-transaction authoritative verification before commit.
-- 4. Automatic engine-level rollback on any constraint, validation, or injected failure.
-- =============================================================================

create or replace function public.import_controlled_batch(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner jsonb;
  v_owner_index integer := 0;
  v_user_id uuid;
  v_auth_id uuid;
  v_pillar_id uuid;
  v_fail_owner_index integer;
  v_allow_overwrite boolean := false;
  v_allow_extra_records boolean := false;
  v_verify_dates boolean := true;

  v_item jsonb;
  v_item_id uuid;
  v_source_number integer;
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
  v_notes text;
  v_progress integer;
  v_publish_at timestamptz;
  v_publish_time_known boolean;
  v_review_status text;
  v_source_content_status text;

  v_link jsonb;
  v_existing_link_id uuid;
  v_link_type text;
  v_link_platform text;
  v_link_url text;
  v_link_label text;
  v_link_sort_order integer;

  v_task jsonb;
  v_task_id uuid;
  v_task_key text;
  v_task_src_num integer;
  v_task_linked_item_id uuid;
  v_task_title text;
  v_task_status text;
  v_task_due_date date;
  v_task_priority text;
  v_task_type text;
  v_task_desc text;

  v_acc jsonb;
  v_acc_id uuid;
  v_acc_platform text;
  v_acc_url text;
  v_acc_label text;
  v_acc_notes text;

  -- Aggregated metric counters
  v_pillars_created integer := 0;
  v_items_created integer := 0;
  v_items_updated integer := 0;
  v_items_preserved integer := 0;
  v_links_created integer := 0;
  v_links_updated integer := 0;
  v_links_preserved integer := 0;
  v_tasks_created integer := 0;
  v_tasks_updated integer := 0;
  v_tasks_preserved integer := 0;
  v_accs_created integer := 0;
  v_accs_updated integer := 0;
  v_accs_preserved integer := 0;

  -- Verification variables
  v_expected_items integer;
  v_expected_links integer;
  v_expected_tasks integer;
  v_expected_accs integer;
  v_actual_items integer;
  v_actual_links integer;
  v_actual_tasks integer;
  v_actual_accs integer;
  v_actual_corrected integer;
  v_actual_unscheduled integer;
  v_decision jsonb;
  v_decision_src_num integer;
  v_decision_date text;
begin
  if p_payload is null or not (p_payload ? 'owners') or jsonb_array_length(p_payload->'owners') = 0 then
    raise exception 'INVALID_PAYLOAD: Missing or empty owners array';
  end if;

  if p_payload ? 'fail_owner_index' and (p_payload->>'fail_owner_index') is not null then
    v_fail_owner_index := (p_payload->>'fail_owner_index')::integer;
  else
    v_fail_owner_index := null;
  end if;

  v_allow_overwrite := coalesce((p_payload->>'allow_overwrite')::boolean, false);
  v_allow_extra_records := coalesce(
    (p_payload->'expected'->>'allow_extra_records')::boolean,
    (p_payload->>'allow_extra_records')::boolean,
    false
  );
  v_verify_dates := coalesce((p_payload->>'verify_date_decisions')::boolean, true);

  -- Process each target owner
  for v_owner in select * from jsonb_array_elements(p_payload->'owners') loop
    v_owner_index := v_owner_index + 1;
    v_user_id := (v_owner->>'user_id')::uuid;
    if v_user_id is null then
      raise exception 'INVALID_PAYLOAD: Missing user_id for owner at index %', v_owner_index;
    end if;

    -- Verify target user exists in auth.users
    select id into v_auth_id from auth.users where id = v_user_id;
    if v_auth_id is null then
      raise exception 'AUTH_GUARD: Target user % not found in auth.users', v_user_id;
    end if;

    -- 1. Default Content Pillar
    select id into v_pillar_id
    from public.content_pillars
    where user_id = v_user_id
    order by sort_order asc, created_at asc
    limit 1;

    if v_pillar_id is null then
      insert into public.content_pillars (
        user_id,
        name_en,
        name_th,
        color,
        sort_order
      ) values (
        v_user_id,
        'General Knowledge',
        'ความรู้ทั่วไปและสินค้า',
        '#8b5cf6',
        1
      ) returning id into v_pillar_id;
      v_pillars_created := v_pillars_created + 1;
    end if;

    -- 2. Content Items and Links
    if v_owner ? 'items' and (v_owner->'items') is not null then
      for v_item in select * from jsonb_array_elements(v_owner->'items') loop
        v_source_number := (v_item->>'source_number')::integer;
        v_title := trim(v_item->>'title');
        v_status := coalesce(v_item->>'status', 'idea');
        v_platforms := array(select jsonb_array_elements_text(v_item->'platforms'));
        v_format := nullif(trim(v_item->>'format'), '');
        v_goal := nullif(trim(v_item->>'goal'), '');
        v_hook := nullif(trim(v_item->>'hook'), '');
        v_objective := nullif(trim(v_item->>'objective'), '');
        v_production_detail := nullif(trim(v_item->>'production_detail'), '');
        v_cta := nullif(trim(v_item->>'cta'), '');
        v_caption := nullif(trim(v_item->>'caption'), '');
        v_notes := nullif(trim(v_item->>'notes'), '');
        v_progress := coalesce((v_item->>'progress')::integer, 0);
        v_publish_at := case when (v_item->>'publish_at') is not null and (v_item->>'publish_at') <> '' then (v_item->>'publish_at')::timestamptz else null end;
        v_publish_time_known := coalesce((v_item->>'publish_time_known')::boolean, false);
        v_review_status := nullif(trim(v_item->>'review_status'), '');
        v_source_content_status := nullif(trim(v_item->>'source_content_status'), '');

        -- Check if item exists by (user_id, source_number)
        select id into v_item_id
        from public.content_items
        where user_id = v_user_id and source_number = v_source_number;

        if v_item_id is not null then
          if v_allow_overwrite then
            -- Overwrite existing item when explicitly approved
            update public.content_items set
              title = v_title,
              status = v_status,
              platforms = v_platforms,
              format = v_format,
              goal = v_goal,
              hook = v_hook,
              objective = v_objective,
              production_detail = v_production_detail,
              cta = v_cta,
              caption = v_caption,
              notes = v_notes,
              progress = v_progress,
              publish_at = v_publish_at,
              publish_time_known = v_publish_time_known,
              review_status = v_review_status,
              source_content_status = v_source_content_status,
              content_pillar_id = coalesce(content_pillar_id, v_pillar_id)
            where id = v_item_id and user_id = v_user_id;

            v_items_updated := v_items_updated + 1;
          else
            -- Safe rerun: PRESERVE existing content item and user edits
            v_items_preserved := v_items_preserved + 1;
          end if;
        else
          -- Insert new item
          insert into public.content_items (
            user_id,
            content_pillar_id,
            source_number,
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
            notes,
            progress,
            publish_at,
            publish_time_known,
            review_status,
            source_content_status
          ) values (
            v_user_id,
            v_pillar_id,
            v_source_number,
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
            v_notes,
            v_progress,
            v_publish_at,
            v_publish_time_known,
            v_review_status,
            v_source_content_status
          ) returning id into v_item_id;

          v_items_created := v_items_created + 1;
        end if;

        -- Non-destructive link reconciliation:
        -- Never deletes existing links or user-added links. Preserves existing link IDs.
        if v_item ? 'links' and (v_item->'links') is not null then
          for v_link in select * from jsonb_array_elements(v_item->'links') loop
            v_link_type := v_link->>'link_type';
            v_link_platform := nullif(trim(v_link->>'platform'), '');
            v_link_url := trim(v_link->>'url');
            v_link_label := nullif(trim(v_link->>'label'), '');
            v_link_sort_order := coalesce((v_link->>'sort_order')::integer, 0);

            -- Check if link with this exact URL already exists on this item
            select id into v_existing_link_id
            from public.content_links
            where user_id = v_user_id and content_item_id = v_item_id and url = v_link_url;

            if v_existing_link_id is not null then
              -- Existing link ID survives!
              if v_allow_overwrite then
                update public.content_links set
                  link_type = v_link_type,
                  platform = v_link_platform,
                  label = v_link_label,
                  sort_order = v_link_sort_order
                where id = v_existing_link_id and user_id = v_user_id;

                v_links_updated := v_links_updated + 1;
              else
                v_links_preserved := v_links_preserved + 1;
              end if;
            else
              -- Missing link from import: insert
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
                v_link_type,
                v_link_platform,
                v_link_url,
                v_link_label,
                v_link_sort_order
              );

              v_links_created := v_links_created + 1;
            end if;
          end loop;
        end if;

      end loop;
    end if;

    -- Check failure injection hook (after content creation and updates for target owner index)
    if v_fail_owner_index is not null and v_owner_index = v_fail_owner_index then
      raise exception '[TEST INJECTION] Simulated failure during owner % after content creation and updates', v_owner_index;
    end if;

    -- 3. Production Tasks
    if v_owner ? 'tasks' and (v_owner->'tasks') is not null then
      for v_task in select * from jsonb_array_elements(v_owner->'tasks') loop
        v_task_key := nullif(trim(v_task->>'import_key'), '');
        v_task_src_num := (v_task->>'source_number')::integer;
        v_task_title := trim(v_task->>'title');
        v_task_status := coalesce(v_task->>'status', 'not_started');
        v_task_due_date := case when (v_task->>'due_date') is not null and (v_task->>'due_date') <> '' then (v_task->>'due_date')::date else null end;
        v_task_priority := nullif(trim(v_task->>'priority'), '');
        v_task_type := nullif(trim(v_task->>'task_type'), '');
        v_task_desc := nullif(trim(v_task->>'description'), '');

        -- Link to content item by source_number if provided
        v_task_linked_item_id := null;
        if v_task_src_num is not null then
          select id into v_task_linked_item_id
          from public.content_items
          where user_id = v_user_id and source_number = v_task_src_num;
        end if;

        -- Check if task exists by import_key
        select id into v_task_id
        from public.production_tasks
        where user_id = v_user_id and import_key = v_task_key;

        if v_task_id is not null then
          if v_allow_overwrite then
            update public.production_tasks set
              content_item_id = v_task_linked_item_id,
              title = v_task_title,
              status = v_task_status,
              due_date = v_task_due_date,
              priority = v_task_priority,
              task_type = v_task_type,
              description = v_task_desc
            where id = v_task_id and user_id = v_user_id;

            v_tasks_updated := v_tasks_updated + 1;
          else
            -- Safe rerun: PRESERVE user task edits
            v_tasks_preserved := v_tasks_preserved + 1;
          end if;
        else
          insert into public.production_tasks (
            user_id,
            content_item_id,
            title,
            status,
            due_date,
            priority,
            task_type,
            description,
            import_key
          ) values (
            v_user_id,
            v_task_linked_item_id,
            v_task_title,
            v_task_status,
            v_task_due_date,
            v_task_priority,
            v_task_type,
            v_task_desc,
            v_task_key
          );

          v_tasks_created := v_tasks_created + 1;
        end if;
      end loop;
    end if;

    -- 4. Reference Accounts
    if v_owner ? 'reference_accounts' and (v_owner->'reference_accounts') is not null then
      for v_acc in select * from jsonb_array_elements(v_owner->'reference_accounts') loop
        v_acc_platform := coalesce(nullif(trim(v_acc->>'platform'), ''), 'tiktok');
        v_acc_url := trim(v_acc->>'url');
        v_acc_label := coalesce(nullif(trim(v_acc->>'account_label'), ''), 'Unnamed Account');
        v_acc_notes := nullif(trim(v_acc->>'notes'), '');

        select id into v_acc_id
        from public.reference_accounts
        where user_id = v_user_id and platform = v_acc_platform and url = v_acc_url;

        if v_acc_id is not null then
          if v_allow_overwrite then
            update public.reference_accounts set
              account_label = v_acc_label,
              notes = v_acc_notes
            where id = v_acc_id and user_id = v_user_id;

            v_accs_updated := v_accs_updated + 1;
          else
            -- Safe rerun: PRESERVE user account edits
            v_accs_preserved := v_accs_preserved + 1;
          end if;
        else
          insert into public.reference_accounts (
            user_id,
            platform,
            account_label,
            url,
            notes
          ) values (
            v_user_id,
            v_acc_platform,
            v_acc_label,
            v_acc_url,
            v_acc_notes
          );

          v_accs_created := v_accs_created + 1;
        end if;
      end loop;
    end if;

  end loop;

  -- ===========================================================================
  -- Authoritative In-Transaction Post-Write Verification
  -- ===========================================================================
  v_expected_items := (p_payload->'expected'->>'content_items')::integer;
  v_expected_links := (p_payload->'expected'->>'content_links')::integer;
  v_expected_tasks := (p_payload->'expected'->>'production_tasks')::integer;
  v_expected_accs := (p_payload->'expected'->>'reference_accounts')::integer;

  for v_owner in select * from jsonb_array_elements(p_payload->'owners') loop
    v_user_id := (v_owner->>'user_id')::uuid;

    select count(*) into v_actual_items from public.content_items where user_id = v_user_id;
    select count(*) into v_actual_links from public.content_links where user_id = v_user_id;
    select count(*) into v_actual_tasks from public.production_tasks where user_id = v_user_id;
    select count(*) into v_actual_accs from public.reference_accounts where user_id = v_user_id;

    if v_expected_items is not null then
      if v_allow_extra_records then
        if v_actual_items < v_expected_items then
          raise exception 'VERIFICATION_FAILED: Content items count below expected for owner %: expected at least %, actual %',
            v_user_id, v_expected_items, v_actual_items;
        end if;
      else
        if v_actual_items <> v_expected_items then
          raise exception 'VERIFICATION_FAILED: Content items count mismatch for owner %: expected %, actual %',
            v_user_id, v_expected_items, v_actual_items;
        end if;
      end if;
    end if;

    if v_expected_links is not null then
      if v_allow_extra_records then
        if v_actual_links < v_expected_links then
          raise exception 'VERIFICATION_FAILED: Content links count below expected for owner %: expected at least %, actual %',
            v_user_id, v_expected_links, v_actual_links;
        end if;
      else
        if v_actual_links <> v_expected_links then
          raise exception 'VERIFICATION_FAILED: Content links count mismatch for owner %: expected %, actual %',
            v_user_id, v_expected_links, v_actual_links;
        end if;
      end if;
    end if;

    if v_expected_tasks is not null then
      if v_allow_extra_records then
        if v_actual_tasks < v_expected_tasks then
          raise exception 'VERIFICATION_FAILED: Production tasks count below expected for owner %: expected at least %, actual %',
            v_user_id, v_expected_tasks, v_actual_tasks;
        end if;
      else
        if v_actual_tasks <> v_expected_tasks then
          raise exception 'VERIFICATION_FAILED: Production tasks count mismatch for owner %: expected %, actual %',
            v_user_id, v_expected_tasks, v_actual_tasks;
        end if;
      end if;
    end if;

    if v_expected_accs is not null then
      if v_allow_extra_records then
        if v_actual_accs < v_expected_accs then
          raise exception 'VERIFICATION_FAILED: Reference accounts count below expected for owner %: expected at least %, actual %',
            v_user_id, v_expected_accs, v_actual_accs;
        end if;
      else
        if v_actual_accs <> v_expected_accs then
          raise exception 'VERIFICATION_FAILED: Reference accounts count mismatch for owner %: expected %, actual %',
            v_user_id, v_expected_accs, v_actual_accs;
        end if;
      end if;
    end if;

    -- Verify exact date decision application (when enabled)
    if v_verify_dates and p_payload ? 'date_decisions' and (p_payload->'date_decisions') is not null and jsonb_array_length(p_payload->'date_decisions') > 0 then
      v_actual_corrected := 0;
      v_actual_unscheduled := 0;

      for v_decision in select * from jsonb_array_elements(p_payload->'date_decisions') loop
        v_decision_src_num := (v_decision->>'source_number')::integer;
        v_decision_date := nullif(trim(v_decision->>'publish_at'), '');

        select publish_at into v_publish_at
        from public.content_items
        where user_id = v_user_id and source_number = v_decision_src_num;

        if not found then
          raise exception 'VERIFICATION_FAILED: Date decision item % missing for owner %', v_decision_src_num, v_user_id;
        end if;

        if v_decision_date is not null then
          if v_publish_at is null or to_char(v_publish_at at time zone 'UTC', 'YYYY-MM-DD') <> v_decision_date then
            raise exception 'VERIFICATION_FAILED: Date mismatch for item % owner %: expected %, got %',
              v_decision_src_num, v_user_id, v_decision_date, v_publish_at;
          end if;
          v_actual_corrected := v_actual_corrected + 1;
        else
          if v_publish_at is not null then
            raise exception 'VERIFICATION_FAILED: Expected unscheduled item % owner % to be null, got %',
              v_decision_src_num, v_user_id, v_publish_at;
          end if;
          v_actual_unscheduled := v_actual_unscheduled + 1;
        end if;
      end loop;

      if (p_payload->'expected' ? 'corrected_date_decisions') and v_actual_corrected <> (p_payload->'expected'->>'corrected_date_decisions')::integer then
        raise exception 'VERIFICATION_FAILED: Corrected dates count mismatch for owner %: expected %, actual %',
          v_user_id, (p_payload->'expected'->>'corrected_date_decisions')::integer, v_actual_corrected;
      end if;

      if (p_payload->'expected' ? 'unscheduled_date_decisions') and v_actual_unscheduled <> (p_payload->'expected'->>'unscheduled_date_decisions')::integer then
        raise exception 'VERIFICATION_FAILED: Unscheduled dates count mismatch for owner %: expected %, actual %',
          v_user_id, (p_payload->'expected'->>'unscheduled_date_decisions')::integer, v_actual_unscheduled;
      end if;
    end if;

  end loop;

  return jsonb_build_object(
    'status', 'success',
    'pillars_created', v_pillars_created,
    'items_created', v_items_created,
    'items_updated', v_items_updated,
    'items_preserved', v_items_preserved,
    'links_created', v_links_created,
    'links_updated', v_links_updated,
    'links_preserved', v_links_preserved,
    'tasks_created', v_tasks_created,
    'tasks_updated', v_tasks_updated,
    'tasks_preserved', v_tasks_preserved,
    'accs_created', v_accs_created,
    'accs_updated', v_accs_updated,
    'accs_preserved', v_accs_preserved
  );
end;
$$;

-- Security: Only service_role can execute this function. Revoke from anon, authenticated, public.
revoke all on function public.import_controlled_batch(jsonb) from public, anon, authenticated;
grant execute on function public.import_controlled_batch(jsonb) to service_role;
