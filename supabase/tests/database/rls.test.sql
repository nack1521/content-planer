-- =============================================================================
-- Content Planner: Database Policy & Isolation Test Suite (pgTAP)
--
-- Validates:
-- 1. Blanket anonymous execution rejection on public tables
-- 2. Owner-scoped CRUD policy enforcement (RLS)
-- 3. Cross-tenant isolation (User 1 data invisible to User 2)
-- 4. Foreign-key cross-tenant attack rejection
-- 5. Foreign-key reassignment attack rejection
-- 6. Content pillar deletion: ON DELETE SET NULL (content_pillar_id) preserves row
-- 7. Content item deletion: cascades to content_links, sets null on production_tasks
-- 8. Storage bucket policy enforcement (content-media)
-- 9. Milestone 3 tables: content_links, production_tasks, reference_accounts
-- 10. Check constraint verification for all UI enums and ranges
-- =============================================================================

begin;
create extension if not exists pgtap;

-- Plan count: exactly 60 assertions
select plan(85);

-- Setup test users in auth.users
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner1@studio.test'),
  ('22222222-2222-2222-2222-222222222222', 'owner2@studio.test')
on conflict (id) do nothing;

-- 1. Anonymous Access Rejection (anon role)
set role anon;

select throws_ok(
  $$select * from public.user_preferences$$,
  '42501',
  null,
  '1. Anonymous user cannot SELECT from user_preferences'
);

select throws_ok(
  $$select * from public.content_pillars$$,
  '42501',
  null,
  '2. Anonymous user cannot SELECT from content_pillars'
);

select throws_ok(
  $$select * from public.content_items$$,
  '42501',
  null,
  '3. Anonymous user cannot SELECT from content_items'
);

select throws_ok(
  $$select * from public.content_media$$,
  '42501',
  null,
  '4. Anonymous user cannot SELECT from content_media'
);

select throws_ok(
  $$select * from public.content_links$$,
  '42501',
  null,
  '5. Anonymous user cannot SELECT from content_links'
);

select throws_ok(
  $$select * from public.production_tasks$$,
  '42501',
  null,
  '6. Anonymous user cannot SELECT from production_tasks'
);

select throws_ok(
  $$select * from public.reference_accounts$$,
  '42501',
  null,
  '7. Anonymous user cannot SELECT from reference_accounts'
);

-- 2. Authenticated User 1 Setup
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

-- User 1 updates user preferences (created automatically by handle_new_user trigger)
select lives_ok(
  $$update public.user_preferences set default_platforms = array['tiktok']
     where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '8. User 1 can update own user_preferences'
);

-- User 1 creates content pillar
select lives_ok(
  $$insert into public.content_pillars (id, user_id, name_en, name_th, color, sort_order)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Product Education', 'ความรู้สินค้า', '#7c3aed', 1)$$,
  '9. User 1 can insert own content_pillar'
);

-- User 1 creates content item referencing own pillar
select lives_ok(
  $$insert into public.content_items (id, user_id, title, content_pillar_id, status, progress, source_number)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'How to use plaster board', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'scripting', 30, 101)$$,
  '10. User 1 can insert content_item referencing own content_pillar'
);

-- User 1 creates content media referencing own item
select lives_ok(
  $$insert into public.content_media (id, user_id, content_item_id, storage_path, media_type, original_name, mime_type, size_bytes)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111/item1/cover.jpg', 'image', 'cover.jpg', 'image/jpeg', 1024)$$,
  '11. User 1 can insert content_media referencing own content_item'
);

-- 3. Cross-Tenant Isolation: User 2 cannot see User 1 data
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

select is_empty(
  $$select * from public.user_preferences where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '12. User 2 cannot read User 1 user_preferences'
);

select is_empty(
  $$select * from public.content_pillars where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '13. User 2 cannot read User 1 content_pillars'
);

select is_empty(
  $$select * from public.content_items where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '14. User 2 cannot read User 1 content_items'
);

select is_empty(
  $$select * from public.content_media where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '15. User 2 cannot read User 1 content_media'
);

-- 4. Cross-Tenant Attack Rejection: User 2 cannot insert with User 1 user_id
select throws_ok(
  $$insert into public.user_preferences (user_id, locale)
     values ('11111111-1111-1111-1111-111111111111', 'en')$$,
  null,
  null,
  '16. User 2 cannot insert user_preferences with User 1 user_id'
);

select throws_ok(
  $$insert into public.content_pillars (user_id, name_en, name_th, color)
     values ('11111111-1111-1111-1111-111111111111', 'Stolen', 'ขโมย', '#000000')$$,
  null,
  null,
  '17. User 2 cannot insert content_pillars with User 1 user_id'
);

select throws_ok(
  $$insert into public.content_items (user_id, title)
     values ('11111111-1111-1111-1111-111111111111', 'Stolen Post')$$,
  null,
  null,
  '18. User 2 cannot insert content_items with User 1 user_id'
);

-- 5. Foreign Key Tenant Isolation: User 2 cannot reference User 1 records
-- User 2 creates own pillar
insert into public.content_pillars (id, user_id, name_en, name_th, color, sort_order)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'User 2 Pillar', 'เสาหลัก 2', '#2563eb', 1);

-- User 2 attempts to insert content item referencing User 1 pillar -> must FAIL
select throws_ok(
  $$insert into public.content_items (id, user_id, title, content_pillar_id)
     values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Attacking Post', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  null,
  null,
  '19. User 2 cannot insert content_item referencing User 1 content_pillar'
);

-- User 2 creates own content item
insert into public.content_items (id, user_id, title, content_pillar_id)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'User 2 Post', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- User 2 attempts to update content item to reference User 1 pillar -> must FAIL
select throws_ok(
  $$update public.content_items
     set content_pillar_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'$$,
  null,
  null,
  '20. User 2 cannot update content_item to reference User 1 content_pillar'
);

-- User 2 attempts to insert media referencing User 1's content item -> must FAIL
select throws_ok(
  $$insert into public.content_media (id, user_id, content_item_id, storage_path, media_type, original_name, mime_type, size_bytes)
     values ('10101010-1010-1010-1010-101010101010', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222/evil/pic.jpg', 'image', 'pic.jpg', 'image/jpeg', 512)$$,
  null,
  null,
  '21. User 2 cannot insert media referencing User 1 content item'
);

-- User 2 creates own media
insert into public.content_media (id, user_id, content_item_id, storage_path, media_type, original_name, mime_type, size_bytes)
values ('20202020-2020-2020-2020-202020202020', '22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222/item2/pic.jpg', 'image', 'pic.jpg', 'image/jpeg', 512);

-- User 2 attempting to update media to reference User 1's content item must FAIL
select throws_ok(
  $$update public.content_media
     set content_item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = '20202020-2020-2020-2020-202020202020'$$,
  null,
  null,
  '22. User 2 cannot update media to reference User 1 content item'
);

-- 6. Pillar Deletion Regression Test (ON DELETE SET NULL (content_pillar_id))
-- Switch to User 1
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

-- Delete User 1's pillar
select lives_ok(
  $$delete from public.content_pillars where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23. User 1 deleting referenced pillar succeeds'
);

-- Verify content item is preserved, user_id is preserved, and content_pillar_id is set to null
select results_eq(
  $$select count(*)::integer from public.content_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  $$values (1)$$,
  '24. Content item is preserved after pillar deletion'
);

select results_eq(
  $$select user_id::text from public.content_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  $$values ('11111111-1111-1111-1111-111111111111'::text)$$,
  '25. Content item owner user_id is preserved and not null'
);

select is(
  (select content_pillar_id from public.content_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  null,
  '26. Content item content_pillar_id is set to null after pillar deletion'
);

-- 7. Storage Bucket Policy Verification
-- User 1 uploads to their own storage folder
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner)
     values ('content-media', '11111111-1111-1111-1111-111111111111/item1/file.png', '11111111-1111-1111-1111-111111111111')$$,
  '27. User 1 can upload object into own folder in content-media bucket'
);

-- User 2 attempts to upload into User 1's folder -> must FAIL
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
     values ('content-media', '11111111-1111-1111-1111-111111111111/stolen/file.png', '22222222-2222-2222-2222-222222222222')$$,
  null,
  null,
  '28. User 2 cannot upload object into User 1 folder'
);

-- User 2 cannot select User 1's storage object
select is_empty(
  $$select * from storage.objects where name like '11111111-1111-1111-1111-111111111111/%'$$,
  '29. User 2 cannot select User 1 storage objects'
);

-- 8. Milestone 3 New Tables: content_links, production_tasks, reference_accounts
-- User 1 creates content link
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

select lives_ok(
  $$insert into public.content_links (id, user_id, content_item_id, link_type, platform, url, label)
     values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'asset', 'youtube', 'https://example.com/asset1', 'Asset 1')$$,
  '30. User 1 can insert content_link for own item'
);

-- User 2 cannot see User 1's content links
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

select is_empty(
  $$select * from public.content_links where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '31. User 2 cannot read User 1 content_links'
);

-- User 2 cannot insert content link referencing User 1's content item
select throws_ok(
  $$insert into public.content_links (id, user_id, content_item_id, link_type, url)
     values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'asset', 'https://example.com/stolen')$$,
  null,
  null,
  '32. User 2 cannot link content_link to User 1 content item'
);

-- User 1 creates production task linked to item and standalone task
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

select lives_ok(
  $$insert into public.production_tasks (id, user_id, content_item_id, title, status, priority, task_type, import_key)
     values ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Edit Video Ep.101', 'in_progress', 'high', 'video', 'task-101')$$,
  '33. User 1 can insert production_task linked to own item'
);

select lives_ok(
  $$insert into public.production_tasks (id, user_id, content_item_id, title, status, priority, task_type)
     values ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', null, 'Standalone Task: Buy Props', 'not_started', 'low', 'other')$$,
  '34. User 1 can insert standalone production_task'
);

-- User 2 cannot see User 1's production tasks
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

select is_empty(
  $$select * from public.production_tasks where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '35. User 2 cannot read User 1 production_tasks'
);

-- User 2 cannot link task to User 1's content item
select throws_ok(
  $$insert into public.production_tasks (id, user_id, content_item_id, title)
     values ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stolen Item Task')$$,
  null,
  null,
  '36. User 2 cannot link task to User 1 content item'
);

-- User 1 creates reference account
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

select lives_ok(
  $$insert into public.reference_accounts (id, user_id, platform, account_label, url)
     values ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'tiktok', '@gypstore_ref', 'https://tiktok.com/@gypstore_ref')$$,
  '37. User 1 can insert reference_account'
);

-- User 2 cannot read User 1 reference accounts
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

select is_empty(
  $$select * from public.reference_accounts where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '38. User 2 cannot read User 1 reference_accounts'
);

-- User 1 cannot duplicate source_number
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

select throws_ok(
  $$insert into public.content_items (user_id, title, source_number)
     values ('11111111-1111-1111-1111-111111111111', 'Duplicate Source Number Post', 101)$$,
  null,
  null,
  '39. User 1 cannot insert duplicate source_number'
);

-- 9. Cross-User UPDATE and DELETE Isolation
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

-- User 2 attempting to UPDATE User 1 content item affects 0 rows
select results_eq(
  $$with upd as (
       update public.content_items set title = 'Hacked'
       where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
       returning id
     ) select count(*)::integer from upd$$,
  $$values (0)$$,
  '40. User 2 cannot UPDATE User 1 content_item'
);

-- User 2 attempting to DELETE User 1 content item affects 0 rows
select results_eq(
  $$with del as (
       delete from public.content_items
       where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
       returning id
     ) select count(*)::integer from del$$,
  $$values (0)$$,
  '41. User 2 cannot DELETE User 1 content_item'
);

-- User 2 attempting to UPDATE User 1 content link affects 0 rows
select results_eq(
  $$with upd as (
       update public.content_links set label = 'Hacked'
       where id = '33333333-3333-3333-3333-333333333333'
       returning id
     ) select count(*)::integer from upd$$,
  $$values (0)$$,
  '42. User 2 cannot UPDATE User 1 content_link'
);

-- User 2 attempting to DELETE User 1 content link affects 0 rows
select results_eq(
  $$with del as (
       delete from public.content_links
       where id = '33333333-3333-3333-3333-333333333333'
       returning id
     ) select count(*)::integer from del$$,
  $$values (0)$$,
  '43. User 2 cannot DELETE User 1 content_link'
);

-- User 2 attempting to UPDATE User 1 production task affects 0 rows
select results_eq(
  $$with upd as (
       update public.production_tasks set title = 'Hacked'
       where id = '55555555-5555-5555-5555-555555555555'
       returning id
     ) select count(*)::integer from upd$$,
  $$values (0)$$,
  '44. User 2 cannot UPDATE User 1 production_task'
);

-- User 2 attempting to DELETE User 1 production task affects 0 rows
select results_eq(
  $$with del as (
       delete from public.production_tasks
       where id = '55555555-5555-5555-5555-555555555555'
       returning id
     ) select count(*)::integer from del$$,
  $$values (0)$$,
  '45. User 2 cannot DELETE User 1 production_task'
);

-- User 2 attempting to UPDATE User 1 reference account affects 0 rows
select results_eq(
  $$with upd as (
       update public.reference_accounts set account_label = 'Hacked'
       where id = '88888888-8888-8888-8888-888888888888'
       returning id
     ) select count(*)::integer from upd$$,
  $$values (0)$$,
  '46. User 2 cannot UPDATE User 1 reference_account'
);

-- User 2 attempting to DELETE User 1 reference account affects 0 rows
select results_eq(
  $$with del as (
       delete from public.reference_accounts
       where id = '88888888-8888-8888-8888-888888888888'
       returning id
     ) select count(*)::integer from del$$,
  $$values (0)$$,
  '47. User 2 cannot DELETE User 1 reference_account'
);

-- 10. Foreign-Key Reassignment Attack Prevention
-- User 2 creates own production task
insert into public.production_tasks (id, user_id, content_item_id, title)
values ('71717171-7171-7171-7171-717171717171', '22222222-2222-2222-2222-222222222222', null, 'User 2 Standalone Task');

-- User 2 tries to update own task to link to User 1 content item -> must FAIL
select throws_ok(
  $$update public.production_tasks
     set content_item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = '71717171-7171-7171-7171-717171717171'$$,
  null,
  null,
  '48. User 2 cannot update own production_task to reference User 1 content_item'
);

-- User 2 creates own content link
insert into public.content_links (id, user_id, content_item_id, link_type, url)
values ('81818181-8181-8181-8181-818181818181', '22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'note', 'https://example.com/user2');

-- User 2 tries to update own content link to link to User 1 content item -> must FAIL
select throws_ok(
  $$update public.content_links
     set content_item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = '81818181-8181-8181-8181-818181818181'$$,
  null,
  null,
  '49. User 2 cannot update own content_link to reference User 1 content_item'
);

-- 11. Content Item Cascade and Set Null Verification
-- Switch back to User 1
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

-- Delete User 1 content item 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
select lives_ok(
  $$delete from public.content_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  '50. User 1 deleting own content item succeeds'
);

-- Verify content link was deleted (ON DELETE CASCADE)
select is_empty(
  $$select * from public.content_links where id = '33333333-3333-3333-3333-333333333333'$$,
  '51. Content links referencing deleted item are cascade-deleted'
);

-- Verify production task was preserved with content_item_id set to null (ON DELETE SET NULL)
select results_eq(
  $$select count(*)::integer from public.production_tasks where id = '55555555-5555-5555-5555-555555555555'$$,
  $$values (1)$$,
  '52. Production task is preserved after referenced content item deletion'
);

select is(
  (select content_item_id from public.production_tasks where id = '55555555-5555-5555-5555-555555555555'),
  null,
  '53. Production task content_item_id is set to null after item deletion'
);

-- 12. Check Constraint Verification (UI Enums vs Database Constraints)
select throws_ok(
  $$insert into public.production_tasks (user_id, title, status)
     values ('11111111-1111-1111-1111-111111111111', 'Bad Status', 'archived')$$,
  null,
  null,
  '54. Invalid task status archived rejected by check constraint'
);

select throws_ok(
  $$insert into public.production_tasks (user_id, title, priority)
     values ('11111111-1111-1111-1111-111111111111', 'Bad Priority', 'urgent')$$,
  null,
  null,
  '55. Invalid task priority urgent rejected by check constraint'
);

select throws_ok(
  $$insert into public.production_tasks (user_id, title, task_type)
     values ('11111111-1111-1111-1111-111111111111', 'Bad Type', 'unsupported_type')$$,
  null,
  null,
  '56. Invalid task type rejected by check constraint'
);

select throws_ok(
  $$insert into public.content_items (user_id, title, format)
     values ('11111111-1111-1111-1111-111111111111', 'Bad Format', 'mp4')$$,
  null,
  null,
  '57. Invalid format rejected by check constraint'
);

select lives_ok(
  $$insert into public.content_items (user_id, title, format)
     values ('11111111-1111-1111-1111-111111111111', 'Photo Format Post', 'photo')$$,
  '58. Format photo accepted by check constraint'
);

select throws_ok(
  $$insert into public.content_items (user_id, title, review_status)
     values ('11111111-1111-1111-1111-111111111111', 'Bad Review Status', 'rejected')$$,
  null,
  null,
  '59. Invalid review_status rejected by check constraint'
);

select throws_ok(
  $$insert into public.content_items (user_id, title, progress)
     values ('11111111-1111-1111-1111-111111111111', 'Bad Progress', 150)$$,
  null,
  null,
  '60. Progress > 100 rejected by range check constraint'
);


-- 11. Atomic Function upsert_content_item_with_links & Rollback Tests
set local role anon;
select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Anon Item", "status": "idea", "platforms": ["tiktok"]}'::jsonb,
      '[]'::jsonb
    )$$,
  '42501',
  null,
  '61. Anonymous execution of upsert_content_item_with_links is denied'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';

select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Atomic Item", "status": "idea", "platforms": ["youtube"]}'::jsonb,
      '[{"link_type": "idea_source", "platform": "youtube", "url": "https://youtube.com/watch?v=123"}]'::jsonb
    )$$,
  '62. Authenticated owner can atomically create content item with links'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Rollback Create Item", "status": "idea", "platforms": ["tiktok"]}'::jsonb,
      '[{"link_type": "invalid_link_type", "url": "https://example.com"}]'::jsonb
    )$$,
  '22023',
  null,
  '63. Invalid link_type throws 22023 and aborts'
);

select is_empty(
  $$select * from public.content_items where title = 'Rollback Create Item'$$,
  '64. Rollback verified: item was not created when link failed'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '123'::jsonb,
      '[]'::jsonb
    )$$,
  '22023',
  null,
  '65. Non-object p_item is rejected with 22023'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Invalid Links Shape", "platforms": ["tiktok"]}'::jsonb,
      '"not-an-array"'::jsonb
    )$$,
  '22023',
  null,
  '66. Non-array p_links is rejected with 22023'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Empty Platforms Item", "platforms": []}'::jsonb,
      '[]'::jsonb
    )$$,
  '22023',
  null,
  '67. Empty platforms array is rejected with 22023 without silent defaulting'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Platform Item", "platforms": ["myspace"]}'::jsonb,
      '[]'::jsonb
    )$$,
  '22023',
  null,
  '68. Invalid platform in array is rejected with 22023'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Scheme Item", "platforms": ["tiktok"]}'::jsonb,
      '[{"link_type": "idea_source", "url": "ftp://files.example.com/asset.mp4"}]'::jsonb
    )$$,
  '22023',
  null,
  '69. Link URL with non-HTTP/HTTPS scheme is rejected with 22023'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Sort Order Item", "platforms": ["tiktok"]}'::jsonb,
      '[{"link_type": "idea_source", "url": "https://example.com", "sort_order": -5}]'::jsonb
    )$$,
  '22023',
  null,
  '70. Link sort_order out of bounds is rejected with 22023'
);

select is_empty(
  $$select * from public.content_items where title in ('Bad Scheme Item', 'Bad Sort Order Item', 'Empty Platforms Item', 'Bad Platform Item')$$,
  '71. Rollback verified: no rows were inserted for any boundary validation failures'
);

-- =============================================================================
-- 11. Explicit function privileges & canonical enum boundary tests
-- =============================================================================

-- Privileges: anon cannot execute, authenticated can
select ok(
  not has_function_privilege('anon', 'public.upsert_content_item_with_links(jsonb, jsonb)', 'execute'),
  '72. anon role cannot execute public.upsert_content_item_with_links'
);

select ok(
  has_function_privilege('authenticated', 'public.upsert_content_item_with_links(jsonb, jsonb)', 'execute'),
  '73. authenticated role can execute public.upsert_content_item_with_links'
);

-- Canonical Platform 'x' accepted on content item and links
select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Platform X Test", "platforms": ["x"]}'::jsonb,
      '[{"link_type": "published", "platform": "x", "url": "https://x.com/post/1"}]'::jsonb
    )$$,
  '74. Platform x is accepted on both item and content links'
);

-- Canonical Formats and Goals accepted
select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Carousel Growth Item", "platforms": ["instagram"], "format": "carousel", "goal": "growth"}'::jsonb,
      '[]'::jsonb
    )$$,
  '75. Format carousel and goal growth are accepted'
);

select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Infographic Leads Item", "platforms": ["facebook"], "format": "infographic", "goal": "leads"}'::jsonb,
      '[]'::jsonb
    )$$,
  '76. Format infographic and goal leads are accepted'
);

select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Story Conversion Item", "platforms": ["instagram"], "format": "story", "goal": "conversion"}'::jsonb,
      '[]'::jsonb
    )$$,
  '77. Format story and goal conversion are accepted'
);

select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Photo Awareness Item", "platforms": ["facebook"], "format": "photo", "goal": "awareness"}'::jsonb,
      '[]'::jsonb
    )$$,
  '78. Format photo and goal awareness are accepted'
);

select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Short Engagement Item", "platforms": ["tiktok"], "format": "short", "goal": "engagement"}'::jsonb,
      '[]'::jsonb
    )$$,
  '79. Format short and goal engagement are accepted'
);

select lives_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Long Growth Item", "platforms": ["youtube"], "format": "long", "goal": "growth"}'::jsonb,
      '[]'::jsonb
    )$$,
  '80. Format long and goal growth are accepted'
);

-- Unsupported format rejected
select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Format Item", "platforms": ["tiktok"], "format": "magazine"}'::jsonb,
      '[]'::jsonb
    )$$,
  '22023',
  null,
  '81. Unsupported format magazine is rejected with 22023'
);

-- Unsupported goals (education, retention) rejected
select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Goal Education Item", "platforms": ["tiktok"], "goal": "education"}'::jsonb,
      '[]'::jsonb
    )$$,
  '22023',
  null,
  '82. Unsupported goal education is rejected with 22023'
);

select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Goal Retention Item", "platforms": ["tiktok"], "goal": "retention"}'::jsonb,
      '[]'::jsonb
    )$$,
  '22023',
  null,
  '83. Unsupported goal retention is rejected with 22023'
);

-- Unsupported link platform rejected
select throws_ok(
  $$select public.upsert_content_item_with_links(
      '{"title": "Bad Link Platform Item", "platforms": ["tiktok"]}'::jsonb,
      '[{"link_type": "idea_source", "platform": "snapchat", "url": "https://snapchat.com"}]'::jsonb
    )$$,
  '22023',
  null,
  '84. Unsupported link platform snapchat is rejected with 22023'
);

select is_empty(
  $$select * from public.content_items where title in ('Bad Format Item', 'Bad Goal Education Item', 'Bad Goal Retention Item', 'Bad Link Platform Item')$$,
  '85. Rollback verified: no rows inserted for unsupported format, goal, or link platform'
);

select * from finish();
rollback;
