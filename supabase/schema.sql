-- ==============================================================================
-- Supabase Schema for Watermark Generator Cloud Templates
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).

-- 1. Create admins table
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

alter table public.admins enable row level security;

-- Only authenticated admins can read admin table
create policy "Admins can view admin list"
  on public.admins
  for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() in (select user_id from public.admins));

-- 2. Create templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  data jsonb not null,
  published boolean default true,
  sort_order integer default 0,
  updated_at timestamptz default now()
);

alter table public.templates enable row level security;

-- Policy: Everyone (public/anon) can view published templates
create policy "Allow public read published templates"
  on public.templates
  for select
  using (
    published = true
    or (auth.uid() is not null and auth.uid() in (select user_id from public.admins))
  );

-- Policy: Only verified admins can insert, update, delete templates
create policy "Allow admin insert templates"
  on public.templates
  for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

create policy "Allow admin update templates"
  on public.templates
  for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

create policy "Allow admin delete templates"
  on public.templates
  for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- 3. Storage bucket for template assets (blank-tag.png, fonts)
insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

-- Public can read any object in the 'templates' bucket
create policy "Public bucket read"
  on storage.objects
  for select
  using (bucket_id = 'templates');

-- Only admins can upload, update, delete files in the 'templates' bucket
create policy "Admin bucket insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'templates'
    and auth.uid() in (select user_id from public.admins)
  );

create policy "Admin bucket update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'templates'
    and auth.uid() in (select user_id from public.admins)
  );

create policy "Admin bucket delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'templates'
    and auth.uid() in (select user_id from public.admins)
  );

-- ==============================================================================
-- INSTRUCTIONS TO ADD YOUR FIRST ADMIN:
-- 1. In Supabase Dashboard -> Authentication -> Users:
--    Click "Add user" -> "Create user" with an email and password.
-- 2. Copy the newly created user's UUID.
-- 3. Run:
--    insert into public.admins (user_id, email)
--    values ('YOUR-USER-UUID-HERE', 'admin@example.com');
-- ==============================================================================
