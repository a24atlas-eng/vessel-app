-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text default 'Игрок',
  gender text default 'vessel_a',
  avatar_url text,
  photo_saved_at timestamptz,
  subscription_status text default 'free', -- 'free' | 'active' | 'canceled'
  plan text, -- 'monthly' | 'yearly'
  paid_until timestamptz, -- used for the one-time yearly plan
  stripe_customer_id text,
  created_at timestamptz default now()
);

create table if not exists core_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  value int not null default 50,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  value int not null default 0,
  created_at timestamptz default now()
);

-- Row Level Security: every user can only ever see/edit their own rows.
alter table profiles enable row level security;
alter table core_programs enable row level security;
alter table goals enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own core programs" on core_programs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PHOTO STORAGE (run this part AFTER creating the 'avatars'
-- bucket in the Supabase dashboard — see README step 1b)
-- ============================================================

-- Each user may only upload/view/replace files inside a folder
-- named after their own user id, e.g. avatars/<user_id>/photo.jpg
create policy "avatar upload own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar public read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

