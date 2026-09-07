-- Enforce ownership of task relations at the database boundary.
-- This is additive and does not delete or rewrite existing rows.
create or replace function public.validate_task_relation_ownership()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.course_id is not null and not exists (
    select 1
    from public.courses
    where courses.id = new.course_id
      and courses.user_id = new.user_id
  ) then
    raise exception 'Task course must belong to the same user';
  end if;

  if new.inbox_item_id is not null and not exists (
    select 1
    from public.inbox_items
    where inbox_items.id = new.inbox_item_id
      and inbox_items.user_id = new.user_id
  ) then
    raise exception 'Task inbox item must belong to the same user';
  end if;

  return new;
end;
$$;

create or replace trigger tasks_validate_relation_ownership
before insert or update of user_id, course_id, inbox_item_id on public.tasks
for each row execute function public.validate_task_relation_ownership();
