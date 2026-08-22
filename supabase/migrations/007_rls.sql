-- =====================================================================
-- 007_rls.sql — row level security. Route guards are convenience only;
-- this file is the actual authorization boundary.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Membership helpers. All SECURITY DEFINER so a policy on table X can ask
-- about table Y without triggering Y's policies (and without recursion).
-- ---------------------------------------------------------------------
create or replace function public.teaches_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class_id
      and m.student_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

-- A teacher may read the profiles of students they teach; a student may
-- read the profiles of the teachers who teach them. Nothing wider.
create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where c.teacher_id = auth.uid() and m.student_id = p_profile_id
  ) or exists (
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where c.teacher_id = p_profile_id and m.student_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.classes          enable row level security;
alter table public.class_members    enable row level security;
alter table public.lesson_sessions  enable row level security;
alter table public.monthly_progress enable row level security;
alter table public.app_settings     enable row level security;

-- ------------------------------ profiles ------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.can_view_profile(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- Users may edit their own profile; the guard trigger from 001 still blocks
-- them from changing their own role or status.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ------------------------------ classes -------------------------------
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (public.is_admin() or teacher_id = auth.uid() or public.is_class_member(id));

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes
  for insert to authenticated
  with check (public.is_admin());

-- A teacher can update their own class. The WITH CHECK clause also stops
-- them from reassigning the class to a different teacher.
drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes
  for update to authenticated
  using (public.is_admin() or teacher_id = auth.uid())
  with check (public.is_admin() or teacher_id = auth.uid());

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes
  for delete to authenticated
  using (public.is_admin());

-- --------------------------- class_members ----------------------------
drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated
  using (public.is_admin() or public.teaches_class(class_id) or student_id = auth.uid());

drop policy if exists class_members_insert on public.class_members;
create policy class_members_insert on public.class_members
  for insert to authenticated
  with check (public.is_admin() or public.teaches_class(class_id));

drop policy if exists class_members_update on public.class_members;
create policy class_members_update on public.class_members
  for update to authenticated
  using (public.is_admin() or public.teaches_class(class_id))
  with check (public.is_admin() or public.teaches_class(class_id));

drop policy if exists class_members_delete on public.class_members;
create policy class_members_delete on public.class_members
  for delete to authenticated
  using (public.is_admin() or public.teaches_class(class_id));

-- --------------------------- lesson_sessions --------------------------
drop policy if exists lesson_sessions_select on public.lesson_sessions;
create policy lesson_sessions_select on public.lesson_sessions
  for select to authenticated
  using (public.is_admin() or public.teaches_class(class_id) or student_id = auth.uid());

drop policy if exists lesson_sessions_insert on public.lesson_sessions;
create policy lesson_sessions_insert on public.lesson_sessions
  for insert to authenticated
  with check (public.is_admin() or public.teaches_class(class_id));

drop policy if exists lesson_sessions_update on public.lesson_sessions;
create policy lesson_sessions_update on public.lesson_sessions
  for update to authenticated
  using (public.is_admin() or public.teaches_class(class_id))
  with check (public.is_admin() or public.teaches_class(class_id));

drop policy if exists lesson_sessions_delete on public.lesson_sessions;
create policy lesson_sessions_delete on public.lesson_sessions
  for delete to authenticated
  using (public.is_admin() or public.teaches_class(class_id));

-- --------------------------- monthly_progress -------------------------
-- Read-only to everyone. The only writer is the SECURITY DEFINER trigger
-- from 005, which bypasses RLS, so no write policy exists at all.
drop policy if exists monthly_progress_select on public.monthly_progress;
create policy monthly_progress_select on public.monthly_progress
  for select to authenticated
  using (public.is_admin() or public.teaches_class(class_id) or student_id = auth.uid());

-- ----------------------------- app_settings ---------------------------
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated using (true);

drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update on public.app_settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- RPCs — the narrow, audited openings in the wall above.
-- =====================================================================

-- Invite pages must show a class before the visitor is a member (or even
-- logged in), so this returns a deliberately thin projection, by code only.
create or replace function public.get_class_by_code(p_code text)
returns table (
  id                 uuid,
  name               text,
  code               text,
  class_type         text,
  status             text,
  sessions_per_month integer,
  max_students       integer,
  member_count       bigint,
  teacher_name       text,
  is_member          boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.code,
    c.class_type,
    c.status,
    c.sessions_per_month,
    c.max_students,
    (select count(*) from public.class_members m
      where m.class_id = c.id and m.status = 'ACTIVE'),
    t.full_name,
    exists (select 1 from public.class_members m
             where m.class_id = c.id and m.student_id = auth.uid())
  from public.classes c
  left join public.profiles t on t.id = c.teacher_id
  where upper(c.code) = upper(btrim(p_code));
$$;

-- Students cannot INSERT into class_members (see policy above), so joining
-- goes through this function, which re-checks every rule itself.
create or replace function public.join_class(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class  record;
  v_role   text;
  v_active integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if v_role is distinct from 'STUDENT' then
    raise exception 'ONLY_STUDENTS_CAN_JOIN';
  end if;

  select c.id, c.status, c.max_students into v_class
  from public.classes c
  where upper(c.code) = upper(btrim(p_code))
  for update;

  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if v_class.status <> 'ACTIVE' then
    raise exception 'CLASS_NOT_ACTIVE';
  end if;

  if exists (select 1 from public.class_members m
              where m.class_id = v_class.id and m.student_id = auth.uid()) then
    raise exception 'ALREADY_A_MEMBER';
  end if;

  select count(*) into v_active
  from public.class_members m
  where m.class_id = v_class.id and m.status = 'ACTIVE';

  if v_active >= v_class.max_students then
    raise exception 'CLASS_FULL';
  end if;

  insert into public.class_members (class_id, student_id) values (v_class.id, auth.uid());
  return v_class.id;
end;
$$;

-- "Add student by email or phone" must find students the caller cannot
-- otherwise see, so it is definer-rights and gated on the caller's role.
create or replace function public.find_student_by_contact(p_query text)
returns table (
  id        uuid,
  full_name text,
  email     text,
  phone     text,
  status    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_q    text := btrim(coalesce(p_query, ''));
begin
  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if v_role not in ('ADMIN', 'TEACHER') then
    raise exception 'FORBIDDEN';
  end if;

  if length(v_q) < 3 then
    return;
  end if;

  return query
  select p.id, p.full_name, p.email, p.phone, p.status
  from public.profiles p
  where p.role = 'STUDENT'
    and (lower(p.email) = lower(v_q)
      -- Phone match ignores formatting, but only when the query actually
      -- contains digits, so a name search cannot match every blank phone.
      or (regexp_replace(v_q, '[^0-9]', '', 'g') <> ''
          and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g')
              = regexp_replace(v_q, '[^0-9]', '', 'g'))
      or lower(p.full_name) like '%' || lower(v_q) || '%')
  order by p.full_name
  limit 10;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants. RLS decides which rows; these decide which verbs.
-- ---------------------------------------------------------------------
revoke all on function public.join_class(text)              from public, anon;
revoke all on function public.find_student_by_contact(text) from public, anon;

grant execute on function public.join_class(text)              to authenticated;
grant execute on function public.find_student_by_contact(text) to authenticated;
grant execute on function public.get_class_by_code(text)       to anon, authenticated;

grant select, insert, update, delete
  on public.profiles, public.classes, public.class_members, public.lesson_sessions
  to authenticated;
grant select on public.monthly_progress to authenticated;
grant select, update on public.app_settings to authenticated;
