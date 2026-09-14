-- ==============================================================================
-- Private Media Storage and User Provisioning Migration
-- ==============================================================================

-- 1. Create Private Storage Bucket for Content Media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  false,
  104857600, -- 100 MB max limit
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ];

-- 2. Storage Policies for Private 'content-media' Bucket
-- Object path structure: {user_id}/{content_item_id}/{generated-file-name}
-- Policy guarantees that auth.uid() matches the top-level user_id folder.

create policy "Owner can view their own private content media"
  on storage.objects for select
  using (
    bucket_id = 'content-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner can upload their own private content media"
  on storage.objects for insert
  with check (
    bucket_id = 'content-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner can update their own private content media"
  on storage.objects for update
  using (
    bucket_id = 'content-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'content-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner can delete their own private content media"
  on storage.objects for delete
  using (
    bucket_id = 'content-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Automatic User Preferences Provisioning Trigger
-- Automatically initializes user_preferences with default 'th' locale and Asia/Bangkok timezone
-- Uses security definer with empty search_path to eliminate search_path injection risks.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_preferences (user_id, locale, timezone)
  values (new.id, 'th', 'Asia/Bangkok')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger runs after a new user is inserted into auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
