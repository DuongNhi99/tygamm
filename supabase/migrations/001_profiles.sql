-- =====================================================================
-- 001_profiles.sql — people (admins, teachers, students) + auth bridge
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles
-- One row per auth user. `id` mirrors auth.users(id) so RLS policies can
-- compare against auth.uid() directly without an extra join.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null default '',
  email       text,
  phone       text,
  avatar_url  text,
  role        text        not null default 'STUDENT'
                          check (role in ('ADMIN', 'TEACHER', 'STUDENT')),
  status      text        not null default 'ACTIVE'
                          check (status in ('ACTIVE', 'INACTIVE')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx        on public.profiles (role);
create index if not exists profiles_status_idx      on public.profiles (status);
create index if not exists profiles_full_name_idx   on public.profiles (lower(full_name));
create index if not exists profiles_phone_idx       on public.profiles (phone) where phone is not null;
create unique index if not exists profiles_email_key on public.profiles (lower(email)) where email is not null;

-- ---------------------------------------------------------------------
-- updated_at bookkeeping (reused by every table in later migrations)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- is_admin() — SECURITY DEFINER so policies on `profiles` can call it
-- without recursing back through profiles' own RLS.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
      and p.status = 'ACTIVE'
  );
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- New auth user -> profile row.
-- Role is read from raw_app_meta_data (service-role writable only), never
-- from raw_user_meta_data, which any client can set at sign-up.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), new.phone),
    case
      when new.raw_app_meta_data ->> 'role' in ('ADMIN', 'TEACHER', 'STUDENT')
        then new.raw_app_meta_data ->> 'role'
      else 'STUDENT'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Privilege-escalation guard: only an admin may change role or status.
-- Backs up the RLS UPDATE policy, which cannot express per-column rules.
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then          -- service role / SQL editor / triggers
    return new;
  end if;
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not public.is_admin() then
    raise exception 'FORBIDDEN_ROLE_CHANGE';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();
