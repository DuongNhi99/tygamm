-- =====================================================================
-- 002_classes.sql — classes, unique class codes, capacity by class type
-- =====================================================================
create table if not exists public.classes (
  id                 uuid primary key default gen_random_uuid(),
  name               text        not null check (length(btrim(name)) > 0),
  code               text        not null,
  class_type         text        not null
                                 check (class_type in ('ONE_TO_ONE', 'ONE_TO_TWO', 'GROUP')),
  max_students       integer     not null default 1 check (max_students between 1 and 100),
  teacher_id         uuid        references public.profiles(id) on delete set null,
  sessions_per_month integer     not null default 8 check (sessions_per_month between 1 and 31),
  start_date         date,
  status             text        not null default 'ACTIVE'
                                 check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Class codes are unique and case-insensitive: GT-BG-0826 == gt-bg-0826.
create unique index if not exists classes_code_key   on public.classes (upper(code));
create index if not exists classes_teacher_id_idx    on public.classes (teacher_id);
create index if not exists classes_status_idx        on public.classes (status);
create index if not exists classes_class_type_idx    on public.classes (class_type);
create index if not exists classes_name_idx          on public.classes (lower(name));

drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Capacity must agree with the class type. GROUP keeps whatever capacity
-- the admin picked, the fixed types pin it so the two can never drift.
-- ---------------------------------------------------------------------
create or replace function public.normalize_class_shape()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(btrim(new.code));

  if new.class_type = 'ONE_TO_ONE' then
    new.max_students := 1;
  elsif new.class_type = 'ONE_TO_TWO' then
    new.max_students := 2;
  elsif new.max_students < 1 then
    new.max_students := 1;
  end if;

  return new;
end;
$$;

drop trigger if exists classes_normalize_shape on public.classes;
create trigger classes_normalize_shape
  before insert or update on public.classes
  for each row execute function public.normalize_class_shape();

-- Shrinking capacity below the current roster would leave the class in an
-- impossible state, so block it at the source.
create or replace function public.guard_class_capacity_shrink()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active integer;
begin
  if new.max_students >= old.max_students then
    return new;
  end if;

  select count(*) into v_active
  from public.class_members m
  where m.class_id = new.id and m.status = 'ACTIVE';

  if v_active > new.max_students then
    raise exception 'CAPACITY_BELOW_ROSTER';
  end if;

  return new;
end;
$$;
