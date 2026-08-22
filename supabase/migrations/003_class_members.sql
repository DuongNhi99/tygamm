-- =====================================================================
-- 003_class_members.sql — class roster + the rules that protect it
-- =====================================================================
create table if not exists public.class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid        not null references public.classes(id) on delete cascade,
  student_id uuid        not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  status     text        not null default 'ACTIVE'
                         check (status in ('ACTIVE', 'INACTIVE')),
  unique (class_id, student_id)
);

create index if not exists class_members_class_id_idx   on public.class_members (class_id);
create index if not exists class_members_student_id_idx on public.class_members (student_id);
create index if not exists class_members_active_idx     on public.class_members (class_id) where status = 'ACTIVE';

-- The capacity guard from 002 needs class_members to exist, so attach it now.
drop trigger if exists classes_guard_capacity_shrink on public.classes;
create trigger classes_guard_capacity_shrink
  before update of max_students on public.classes
  for each row execute function public.guard_class_capacity_shrink();

-- ---------------------------------------------------------------------
-- Enrolment rules, enforced in the database so no code path can skip them:
--   * class must exist and be ACTIVE
--   * class must not already be full
--   * only STUDENT profiles can be enrolled
-- `for update` on the class row serialises concurrent enrolments, which is
-- what stops two simultaneous joins from both slipping past a full class.
-- ---------------------------------------------------------------------
create or replace function public.enforce_enrolment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status       text;
  v_max          integer;
  v_active       integer;
  v_student_role text;
begin
  -- Only insertions and reactivations consume a seat.
  if tg_op = 'UPDATE' and not (old.status = 'INACTIVE' and new.status = 'ACTIVE') then
    return new;
  end if;

  select c.status, c.max_students into v_status, v_max
  from public.classes c
  where c.id = new.class_id
  for update;

  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if v_status <> 'ACTIVE' then
    raise exception 'CLASS_NOT_ACTIVE';
  end if;

  select p.role into v_student_role
  from public.profiles p
  where p.id = new.student_id;

  if v_student_role is distinct from 'STUDENT' then
    raise exception 'NOT_A_STUDENT';
  end if;

  select count(*) into v_active
  from public.class_members m
  where m.class_id = new.class_id
    and m.status = 'ACTIVE'
    and m.id <> new.id;

  if v_active >= v_max then
    raise exception 'CLASS_FULL';
  end if;

  return new;
end;
$$;

drop trigger if exists class_members_enforce_rules on public.class_members;
create trigger class_members_enforce_rules
  before insert or update on public.class_members
  for each row execute function public.enforce_enrolment_rules();
