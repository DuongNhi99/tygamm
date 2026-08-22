-- =====================================================================
-- 005_monthly_progress.sql — derived monthly rollup, maintained by trigger
-- =====================================================================
-- This table is a cache of lesson_sessions, never written by application
-- code. Recomputing on write keeps dashboards and reports on a single
-- indexed read instead of aggregating thousands of session rows.
create table if not exists public.monthly_progress (
  id                uuid primary key default gen_random_uuid(),
  class_id          uuid          not null references public.classes(id) on delete cascade,
  student_id        uuid          not null references public.profiles(id) on delete cascade,
  year              integer       not null,
  month             integer       not null check (month between 1 and 12),
  average_score     numeric(4, 2),
  attendance_rate   numeric(5, 2),
  lessons_completed integer       not null default 0,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  unique (class_id, student_id, year, month)
);

create index if not exists monthly_progress_class_period_idx   on public.monthly_progress (class_id, year, month);
create index if not exists monthly_progress_student_period_idx on public.monthly_progress (student_id, year, month);

drop trigger if exists monthly_progress_set_updated_at on public.monthly_progress;
create trigger monthly_progress_set_updated_at
  before update on public.monthly_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Rollup rules
--   average_score   = mean of scored sessions only (unscored are ignored)
--   attendance_rate = (PRESENT + MAKEUP) / sessions with attendance recorded
--   lessons_completed = PRESENT + MAKEUP  (a made-up lesson still happened)
-- ---------------------------------------------------------------------
create or replace function public.recompute_monthly_progress(
  p_class_id   uuid,
  p_student_id uuid,
  p_year       integer,
  p_month      integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg      numeric(4, 2);
  v_scored   integer;
  v_recorded integer;
  v_attended integer;
  v_rate     numeric(5, 2);
begin
  select
    round(avg(s.score) filter (where s.score is not null), 2),
    count(*) filter (where s.score is not null),
    count(*) filter (where s.attendance is not null),
    count(*) filter (where s.attendance in ('PRESENT', 'MAKEUP'))
  into v_avg, v_scored, v_recorded, v_attended
  from public.lesson_sessions s
  where s.class_id = p_class_id
    and s.student_id = p_student_id
    and s.period_year = p_year
    and s.period_month = p_month;

  if coalesce(v_scored, 0) = 0 and coalesce(v_recorded, 0) = 0 then
    delete from public.monthly_progress
    where class_id = p_class_id
      and student_id = p_student_id
      and year = p_year
      and month = p_month;
    return;
  end if;

  v_rate := case
    when coalesce(v_recorded, 0) = 0 then null
    else round((v_attended::numeric * 100) / v_recorded, 2)
  end;

  insert into public.monthly_progress
    (class_id, student_id, year, month, average_score, attendance_rate, lessons_completed)
  values
    (p_class_id, p_student_id, p_year, p_month, v_avg, v_rate, coalesce(v_attended, 0))
  on conflict (class_id, student_id, year, month) do update
    set average_score     = excluded.average_score,
        attendance_rate   = excluded.attendance_rate,
        lessons_completed = excluded.lessons_completed,
        updated_at        = now();
end;
$$;

create or replace function public.sync_monthly_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recompute_monthly_progress(
      old.class_id, old.student_id, old.period_year, old.period_month);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recompute_monthly_progress(
      new.class_id, new.student_id, new.period_year, new.period_month);
  end if;

  return null;
end;
$$;

drop trigger if exists lesson_sessions_sync_progress on public.lesson_sessions;
create trigger lesson_sessions_sync_progress
  after insert or update or delete on public.lesson_sessions
  for each row execute function public.sync_monthly_progress();
