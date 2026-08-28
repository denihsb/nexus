create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  code text not null default '' check (char_length(code) <= 20),
  color_token text not null default 'teal',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_user_id_idx on public.courses(user_id);
create unique index courses_user_name_active_idx on public.courses(user_id, lower(name)) where is_archived = false;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;

create policy "Users can view their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can view their courses" on public.courses for select using (auth.uid() = user_id);
create policy "Users can create their courses" on public.courses for insert with check (auth.uid() = user_id);
create policy "Users can update their courses" on public.courses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can archive their courses" on public.courses for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
