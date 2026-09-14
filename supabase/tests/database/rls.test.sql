-- ==============================================================================
-- pgTAP Database Policy and Row Level Security Test Suite
-- ==============================================================================
-- Run with: supabase test db (or pg_prove / psql with pgTAP installed)

begin;
select plan(24);

-- 1. Setup Test Users in auth.users
create extension if not exists pgtap;

-- Define test UUIDs
\set user1 '11111111-1111-1111-1111-111111111111'
\set user2 '22222222-2222-2222-2222-222222222222'

insert into auth.users (id, email)
values
  (':'user1, 'owner1@studio.test'),
  (':'user2, 'owner2@studio.test')
on conflict (id) do nothing;

-- 2. Verify Anonymous Role Permissions (Must Fail Closed / Denied)
set role anon;

select throws_ok(
  $$ select * from public.user_preferences $$,
  '42501',
  null,
  'anon role cannot select from user_preferences'
);

select throws_ok(
  $$ select * from public.content_pillars $$,
  '42501',
  null,
  'anon role cannot select from content_pillars'
);

select throws_ok(
  $$ select * from public.content_items $$,
  '42501',
  null,
  'anon role cannot select from content_items'
);

select throws_ok(
  $$ select * from public.content_media $$,
  '42501',
  null,
  'anon role cannot select from content_media'
);

select throws_ok(
  $$ insert into public.content_items (title) values ('Anon item') $$,
  '42501',
  null,
  'anon role cannot insert into content_items'
);

-- 3. Authenticated User 1 Operations (Owner 1)
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

-- User 1 provisions preferences
select lives_ok(
  $$ insert into public.user_preferences (user_id, locale, timezone)
     values ('11111111-1111-1111-1111-111111111111', 'th', 'Asia/Bangkok')
     on conflict (user_id) do nothing $$,
  'User 1 can insert own user_preferences'
);

-- User 1 creates content pillar
select lives_ok(
  $$ insert into public.content_pillars (id, user_id, name_en, name_th, color)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Tech', 'เทคโนโลยี', '#8b5cf6') $$,
  'User 1 can create own content pillar'
);

-- User 1 creates content item with own pillar
select lives_ok(
  $$ insert into public.content_items (id, user_id, title, content_pillar_id, status)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'User 1 Post', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'idea') $$,
  'User 1 can create content item with own pillar'
);

-- User 1 creates content media
select lives_ok(
  $$ insert into public.content_media (id, user_id, content_item_id, storage_path, media_type, original_name, mime_type, size_bytes)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111/item1/cover.jpg', 'image', 'cover.jpg', 'image/jpeg', 1024) $$,
  'User 1 can insert media for own item'
);

-- User 1 can select own item
select results_eq(
  $$ select count(*)::integer from public.content_items where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (1) $$,
  'User 1 sees exactly their own content item'
);

-- 4. Cross-Owner Isolation (User 2 Attempts Access to User 1 Records)
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

-- User 2 cannot see User 1's content items
select is_empty(
  $$ select * from public.content_items where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'User 2 cannot read User 1 content items'
);

-- User 2 cannot see User 1's content pillars
select is_empty(
  $$ select * from public.content_pillars where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'User 2 cannot read User 1 content pillars'
);

-- User 2 cannot see User 1's media
select is_empty(
  $$ select * from public.content_media where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'User 2 cannot read User 1 media'
);

-- User 2 cannot update User 1's content item
select lives_ok(
  $$ update public.content_items set title = 'Hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'User 2 update statement executes cleanly without updating rows'
);

select is(
  (select title from public.content_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  null,
  'User 2 cannot see or alter User 1 item title'
);

-- 5. Cross-Owner Foreign Key and Relationship Integrity
-- User 2 attempting to insert a content item pointing to User 1's content pillar must FAIL
select throws_ok(
  $$ insert into public.content_items (id, user_id, title, content_pillar_id, status)
     values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'User 2 Stolen Pillar', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'idea') $$,
  null,
  null,
  'User 2 cannot link item to User 1 content pillar on INSERT'
);

-- User 2 creates own pillar and own item
insert into public.content_pillars (id, user_id, name_en, name_th, color)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Marketing', 'การตลาด', '#10b981');

insert into public.content_items (id, user_id, title, content_pillar_id, status)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'User 2 Item', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'idea');

-- User 2 attempting to update their item to point to User 1's content pillar must FAIL
select throws_ok(
  $$ update public.content_items
     set content_pillar_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' $$,
  null,
  null,
  'User 2 cannot update item to reference User 1 content pillar'
);

-- User 2 attempting to attach media to User 1's content item must FAIL
select throws_ok(
  $$ insert into public.content_media (id, user_id, content_item_id, storage_path, media_type, original_name, mime_type, size_bytes)
     values ('10101010-1010-1010-1010-101010101010', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222/evil/pic.jpg', 'image', 'pic.jpg', 'image/jpeg', 512) $$,
  null,
  null,
  'User 2 cannot insert media referencing User 1 content item'
);

-- User 2 creates own media
insert into public.content_media (id, user_id, content_item_id, storage_path, media_type, original_name, mime_type, size_bytes)
values ('20202020-2020-2020-2020-202020202020', '22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222/item2/pic.jpg', 'image', 'pic.jpg', 'image/jpeg', 512);

-- User 2 attempting to update media to reference User 1's content item must FAIL
select throws_ok(
  $$ update public.content_media
     set content_item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = '20202020-2020-2020-2020-202020202020' $$,
  null,
  null,
  'User 2 cannot update media to reference User 1 content item'
);

-- 6. Storage Bucket Policy Verification
-- User 1 uploads to their own storage folder
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "owner1@studio.test"}', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('content-media', '11111111-1111-1111-1111-111111111111/item1/file.png', '11111111-1111-1111-1111-111111111111') $$,
  'User 1 can upload object into own folder in content-media bucket'
);

-- User 2 attempts to upload into User 1's folder -> must FAIL
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "owner2@studio.test"}', true);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('content-media', '11111111-1111-1111-1111-111111111111/stolen/file.png', '22222222-2222-2222-2222-222222222222') $$,
  null,
  null,
  'User 2 cannot upload object into User 1 folder'
);

-- User 2 cannot select User 1's storage object
select is_empty(
  $$ select * from storage.objects where name like '11111111-1111-1111-1111-111111111111/%' $$,
  'User 2 cannot select User 1 storage objects'
);

select * from finish();
rollback;
