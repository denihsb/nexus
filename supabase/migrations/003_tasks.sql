create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  inbox_item_id uuid unique references public.inbox_items(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text not null default '',
  due_at timestamptz,
  effort_minutes integer check (effort_minutes is null or effort_minutes between 1 and 1440),
  importance smallint not null default 2 check (importance between 1 and 3),
  status text not null default 'open' check (status in ('open', 'completed', 'archived')),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_user_due_idx on public.tasks(user_id, due_at);
create index tasks_user_course_idx on public.tasks(user_id, course_id);

alter table public.tasks enable row level security;

create policy "Users can view their tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "Users can create their tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their tasks" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their tasks" on public.tasks for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger tasks_touch_updated_at
before update on public.tasks
for each row execute procedure public.touch_updated_at();
