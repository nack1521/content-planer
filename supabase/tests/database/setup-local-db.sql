-- ==============================================================================
-- Local Test Environment Bootstrap for Mock Supabase Auth & Storage
-- ==============================================================================

-- 1. Create Supabase test roles if they do not exist
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

-- 2. Mock auth schema and functions
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$;

grant usage on schema auth to anon, authenticated;
grant select on auth.users to anon, authenticated;

-- 3. Mock storage schema and functions
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

create or replace function storage.filename(name text)
returns text
language sql
immutable
as $$
  select split_part(name, '/', array_length(string_to_array(name, '/'), 1));
$$;

create or replace function storage.extension(name text)
returns text
language sql
immutable
as $$
  select split_part(name, '.', array_length(string_to_array(name, '.'), 1));
$$;

grant usage on schema storage to anon, authenticated;
grant all on storage.buckets to anon, authenticated;
grant all on storage.objects to anon, authenticated;
