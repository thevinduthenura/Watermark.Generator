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
-- 4. User Profiles Table (Stores registered photographers/users in public schema)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  studio_name text,
  role text default 'photographer',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Policy: Everyone can view registered profiles (or authenticated only)
create policy "Allow read profiles"
  on public.profiles
  for select
  using (true);

-- Policy: Authenticated users can insert their own profile
create policy "Allow insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Allow update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: Automatically copy new registered user from auth.users to public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, studio_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'studio_name', split_part(new.email, '@', 1) || ' Studio'),
    coalesce(new.raw_user_meta_data->>'role', 'photographer')
  )
  on conflict (id) do update set
    email = excluded.email,
    studio_name = excluded.studio_name;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- HOW ADMIN ACCOUNTS WORK:
--
-- 1. Sign up on the app at http://localhost:3000/login or in Supabase Dashboard
--    (Authentication -> Users -> Add User) with your email and password.
--
-- 2. Turn that user into an ADMIN by running this in Supabase SQL Editor:
--    insert into public.admins (user_id, email)
--    select id, email from auth.users where email = 'YOUR_EMAIL@EXAMPLE.COM'
--    on conflict (user_id) do nothing;
--
-- 3. Now that user has full access to publish, edit, and delete cloud templates!
-- ==============================================================================

