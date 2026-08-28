create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_text text not null check (char_length(trim(raw_text)) between 1 and 500),
  status text not null default 'unprocessed' check (status in ('unprocessed', 'processed', 'archived')),
  captured_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inbox_items_user_status_idx on public.inbox_items(user_id, status);
create index inbox_items_user_captured_idx on public.inbox_items(user_id, captured_at desc);

alter table public.inbox_items enable row level security;

create policy "Users can view their inbox items" on public.inbox_items for select using (auth.uid() = user_id);
create policy "Users can create their inbox items" on public.inbox_items for insert with check (auth.uid() = user_id);
create policy "Users can update their inbox items" on public.inbox_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their inbox items" on public.inbox_items for delete using (auth.uid() = user_id);
