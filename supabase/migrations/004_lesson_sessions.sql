-- =====================================================================
-- 004_lesson_sessions.sql — one row per (student, class, month, session)
-- =====================================================================
-- Sessions are counted per calendar month ("session 3 of August"), so the
-- month is stored explicitly as period_year/period_month rather than being
-- derived from lesson_date. That keeps the uniqueness constraint simple and
-- lets a teacher record a score before the lesson date is known.
create table if not exists public.lesson_sessions (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid          not null references public.classes(id) on delete cascade,
  student_id     uuid          not null references public.profiles(id) on delete cascade,
  period_year    integer       not null check (period_year between 2000 and 2100),
  period_month   integer       not null check (period_month between 1 and 12),
  session_number integer       not null check (session_number >= 1),
  lesson_date    date,
  score          numeric(4, 2) check (score >= 0 and score <= 10),
  attendance     text          check (attendance in ('PRESENT', 'ABSENT', 'MAKEUP')),
  teacher_note   text,
  homework       text,
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now(),
  unique (class_id, student_id, period_year, period_month, session_number)
);

create index if not exists lesson_sessions_class_id_idx    on public.lesson_sessions (class_id);
create index if not exists lesson_sessions_student_id_idx  on public.lesson_sessions (student_id);
create index if not exists lesson_sessions_lesson_date_idx on public.lesson_sessions (lesson_date);
create index if not exists lesson_sessions_period_idx      on public.lesson_sessions (class_id, period_year, period_month);
create index if not exists lesson_sessions_student_period_idx
  on public.lesson_sessions (student_id, period_year, period_month);

drop trigger if exists lesson_sessions_set_updated_at on public.lesson_sessions;
create trigger lesson_sessions_set_updated_at
  before update on public.lesson_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- A session is only valid if the student is on the class roster and the
-- session number fits inside that class's monthly allowance.
-- ---------------------------------------------------------------------
create or replace function public.enforce_session_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sessions_per_month integer;
  v_is_member          boolean;
begin
  select c.sessions_per_month into v_sessions_per_month
  from public.classes c
  where c.id = new.class_id;

  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if new.session_number > v_sessions_per_month then
    raise exception 'SESSION_NUMBER_OUT_OF_RANGE';
  end if;

  select exists (
    select 1 from public.class_members m
    where m.class_id = new.class_id and m.student_id = new.student_id
  ) into v_is_member;

  if not v_is_member then
    raise exception 'NOT_A_CLASS_MEMBER';
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_sessions_enforce_rules on public.lesson_sessions;
create trigger lesson_sessions_enforce_rules
  before insert or update on public.lesson_sessions
  for each row execute function public.enforce_session_rules();
