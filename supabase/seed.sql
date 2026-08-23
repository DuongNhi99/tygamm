-- =====================================================================
-- seed.sql — DEVELOPMENT DATA ONLY. Never run against production.
--
-- Creates sign-in-ready accounts, all with the password below, plus three
-- classes and a month of scored sessions so every screen has real data.
--
--   admin@example.com     ADMIN
--   teacher@example.com   TEACHER   (Nguyen Van A)
--   teacher2@example.com  TEACHER   (Tran Thi B)
--   student1..5@example.com         STUDENT
--
--   password: Password123!
--
-- Run after migrations 001-007, from the Supabase SQL editor or
-- `supabase db reset`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Creates a confirmed email/password account. Roles arrive through
-- raw_app_meta_data because handle_new_user() refuses to trust
-- raw_user_meta_data for anything privilege-related.
-- ---------------------------------------------------------------------
create or replace function public.seed_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if found then
    return v_id;
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', p_role
    ),
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    '', '', '', ''
  );

  -- GoTrue will not accept an email/password sign-in without this row.
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_id::text,
    v_id,
    jsonb_build_object(
      'sub', v_id::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  update public.profiles
     set full_name = p_full_name,
         phone     = p_phone
   where id = v_id;

  return v_id;
end;
$$;

do $$
declare
  v_admin      uuid;
  v_teacher1   uuid;
  v_teacher2   uuid;
  v_students   uuid[];
  v_class_beg  uuid;
  v_class_int  uuid;
  v_class_solo uuid;
  v_year       integer := extract(year  from current_date)::integer;
  v_month      integer := extract(month from current_date)::integer;
  v_student    uuid;
  v_session    integer;
  v_score      numeric(4, 2);
  v_attendance text;
  v_idx        integer;
begin
  -- ----------------------------------------------------------------- people
  v_admin    := public.seed_user('admin@example.com',    'Password123!', 'Admin Tygamm', 'ADMIN',   '0900000001');
  v_teacher1 := public.seed_user('teacher@example.com',  'Password123!', 'Nguyen Van A',     'TEACHER', '0900000002');
  v_teacher2 := public.seed_user('teacher2@example.com', 'Password123!', 'Tran Thi B',       'TEACHER', '0900000003');

  v_students := array[
    public.seed_user('student1@example.com', 'Password123!', 'Nguyen Minh Anh',  'STUDENT', '0901234567'),
    public.seed_user('student2@example.com', 'Password123!', 'Tran Minh Khoa',   'STUDENT', '0901234568'),
    public.seed_user('student3@example.com', 'Password123!', 'Le Thuy Duong',    'STUDENT', '0901234569'),
    public.seed_user('student4@example.com', 'Password123!', 'Pham Gia Bao',     'STUDENT', '0901234570'),
    public.seed_user('student5@example.com', 'Password123!', 'Vo Ngoc Han',      'STUDENT', '0901234571')
  ];

  -- ---------------------------------------------------------------- classes
  insert into public.classes (name, code, class_type, max_students, teacher_id, sessions_per_month, start_date, status)
  values ('Guitar Beginner', 'GT-BG-0826', 'GROUP', 8, v_teacher1, 8, date_trunc('month', current_date)::date, 'ACTIVE')
  on conflict do nothing
  returning id into v_class_beg;
  if v_class_beg is null then
    select id into v_class_beg from public.classes where upper(code) = 'GT-BG-0826';
  end if;

  insert into public.classes (name, code, class_type, max_students, teacher_id, sessions_per_month, start_date, status)
  values ('Guitar Intermediate', 'GT-IN-0826', 'ONE_TO_TWO', 2, v_teacher2, 8, date_trunc('month', current_date)::date, 'ACTIVE')
  on conflict do nothing
  returning id into v_class_int;
  if v_class_int is null then
    select id into v_class_int from public.classes where upper(code) = 'GT-IN-0826';
  end if;

  insert into public.classes (name, code, class_type, max_students, teacher_id, sessions_per_month, start_date, status)
  values ('Guitar 1-1', 'GT-11-0826', 'ONE_TO_ONE', 1, v_teacher1, 8, date_trunc('month', current_date)::date, 'ACTIVE')
  on conflict do nothing
  returning id into v_class_solo;
  if v_class_solo is null then
    select id into v_class_solo from public.classes where upper(code) = 'GT-11-0826';
  end if;

  -- ---------------------------------------------------------------- roster
  foreach v_student in array v_students[1:4] loop
    insert into public.class_members (class_id, student_id)
    values (v_class_beg, v_student)
    on conflict (class_id, student_id) do nothing;
  end loop;

  insert into public.class_members (class_id, student_id) values (v_class_int, v_students[5])
  on conflict (class_id, student_id) do nothing;
  insert into public.class_members (class_id, student_id) values (v_class_int, v_students[1])
  on conflict (class_id, student_id) do nothing;

  insert into public.class_members (class_id, student_id) values (v_class_solo, v_students[2])
  on conflict (class_id, student_id) do nothing;

  -- -------------------------------------------------- seven of eight lessons
  -- Scores wobble around 8.5 and every fourth student misses session 5, so
  -- averages and attendance rates are not all identical on screen.
  for v_idx in 1..4 loop
    v_student := v_students[v_idx];
    for v_session in 1..7 loop
      v_score := round((8.0 + ((v_idx * 3 + v_session * 5) % 5) * 0.5)::numeric, 2);
      v_attendance := case when v_idx = 4 and v_session = 5 then 'ABSENT' else 'PRESENT' end;

      insert into public.lesson_sessions (
        class_id, student_id, period_year, period_month, session_number,
        lesson_date, score, attendance, teacher_note, homework
      ) values (
        v_class_beg, v_student, v_year, v_month, v_session,
        (date_trunc('month', current_date) + ((v_session - 1) * interval '3 days'))::date,
        case when v_attendance = 'ABSENT' then null else v_score end,
        v_attendance,
        case when v_session = 7
             then 'Chord transitions much smoother. Keep working on Am -> C -> G -> Em.'
             else null end,
        case when v_session = 7
             then 'Practice G -> C -> Em -> D, 10 minutes/day, metronome at 70 BPM.'
             else null end
      )
      on conflict (class_id, student_id, period_year, period_month, session_number) do nothing;
    end loop;
  end loop;

  -- A previous month for the intermediate class, so progress charts have a
  -- month-over-month comparison to draw.
  for v_session in 1..8 loop
    insert into public.lesson_sessions (
      class_id, student_id, period_year, period_month, session_number,
      lesson_date, score, attendance
    ) values (
      v_class_int, v_students[5], v_year, v_month, v_session,
      (date_trunc('month', current_date) + ((v_session - 1) * interval '3 days'))::date,
      round((8.2 + (v_session % 4) * 0.4)::numeric, 2),
      'PRESENT'
    )
    on conflict (class_id, student_id, period_year, period_month, session_number) do nothing;

    insert into public.lesson_sessions (
      class_id, student_id, period_year, period_month, session_number,
      lesson_date, score, attendance
    ) values (
      v_class_int,
      v_students[5],
      extract(year  from (current_date - interval '1 month'))::integer,
      extract(month from (current_date - interval '1 month'))::integer,
      v_session,
      (date_trunc('month', current_date - interval '1 month') + ((v_session - 1) * interval '3 days'))::date,
      round((7.6 + (v_session % 3) * 0.4)::numeric, 2),
      'PRESENT'
    )
    on conflict (class_id, student_id, period_year, period_month, session_number) do nothing;
  end loop;
end;
$$;

drop function if exists public.seed_user(text, text, text, text, text);
