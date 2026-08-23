# Tygamm

Class management for a guitar teaching centre — classes, rosters, attendance,
scores and monthly progress. Next.js 16 (App Router) + Supabase (Postgres,
Auth, Row Level Security).

---

## Setup

### 1. Create a Supabase project

<https://supabase.com/dashboard> → **New project**. Then copy
**Project Settings → API** values into `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Where it is used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | safe to expose; RLS constrains it |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypasses RLS — required only to create teacher/student accounts |
| `NEXT_PUBLIC_SITE_URL` | server | builds password-reset and invite links |

The app runs without `SUPABASE_SERVICE_ROLE_KEY`; only the "Add teacher" and
"Add student" buttons need it, because minting an auth account is an Auth
Admin API operation. Those screens say so explicitly when it is missing.

### 2. Run the migrations

In the Supabase dashboard → **SQL Editor**, run these in order:

```
supabase/migrations/001_profiles.sql
supabase/migrations/002_classes.sql
supabase/migrations/003_class_members.sql
supabase/migrations/004_lesson_sessions.sql
supabase/migrations/005_monthly_progress.sql
supabase/migrations/006_app_settings.sql
supabase/migrations/007_rls.sql
```

Or, with the Supabase CLI linked to the project: `supabase db push`.

### 3. Seed development data (optional)

`supabase/seed.sql` creates sign-in-ready accounts, three classes and a month
of scored lessons so every screen has real data.

```
admin@example.com      ADMIN
teacher@example.com    TEACHER   (Nguyen Van A)
teacher2@example.com   TEACHER   (Tran Thi B)
student1..5@example.com          STUDENT

password: Password123!
```

**Development only.** It writes directly into `auth.users`; never run it
against production.

### 4. Start

```bash
npm install
npm run dev
```

<http://localhost:3000>

---

## How it is put together

```
src/
├── app/                       routes + Server Actions (actions.ts per feature)
│   ├── (auth)/                login, forgot-password, reset-password
│   ├── (dashboard)/           everything behind a session
│   ├── auth/callback/         email-link exchange (PKCE or token_hash)
│   └── join/[classCode]/      public class invitation
├── components/                ui/ layout/ dashboard/ classes/ students/ …
├── lib/                       supabase/ auth/ permissions/ validations/ utils/
├── services/                  all data access — no queries in components
├── types/                     database.ts mirrors the migrations
└── proxy.ts                   session refresh (Next 16's middleware)
```

**Data flows one way.** Server Component → service → Supabase → RLS. Client
Components handle interaction only; they never query the database, so there is
no second, weaker data path.

### Security model

Row Level Security is the authorization boundary — route guards are
convenience. Every table has policies (`007_rls.sql`); `requireRole()` only
decides what to render.

Three things deliberately bypass a table policy, each through a narrow
`SECURITY DEFINER` function that re-checks its own rules:

| Function | Why it exists |
|---|---|
| `get_class_by_code` | invite pages must show a class to someone who is not a member, or not signed in |
| `join_class` | students have no INSERT policy on `class_members`; this validates active/full/duplicate under a row lock |
| `find_student_by_contact` | "add by email or phone" must find students the caller cannot otherwise see; gated on the caller's role |

Roles arrive via `raw_app_meta_data`, which clients cannot write —
`handle_new_user()` refuses to read a role from `raw_user_meta_data`, so
nobody can sign up as an admin. A trigger blocks non-admins from changing
`role` or `status`, which RLS alone cannot express per-column.

### Business rules live in the database

Enforced by constraints and triggers, so no code path can skip them:

- class codes unique (case-insensitive)
- capacity respected on enrolment, `FOR UPDATE` serialising concurrent joins
- capacity cannot be lowered below the current roster
- only `STUDENT` profiles can be enrolled; inactive classes take no one
- a student cannot be enrolled twice
- `0 ≤ score ≤ 10`; `session_number` within the class's monthly allowance
- students are removed by deactivating the membership, never by deleting it

### Monthly rollups

`monthly_progress` is a trigger-maintained cache of `lesson_sessions`, never
written by application code. Dashboards and reports read one indexed row per
student-month instead of aggregating raw sessions.

```
average_score     mean of scored sessions only (ungraded lessons are skipped,
                  not counted as zero)
attendance_rate   (PRESENT + MAKEUP) / sessions with attendance recorded
lessons_completed PRESENT + MAKEUP — a made-up lesson still happened
```

### Sessions are counted per month

`lesson_sessions` stores `period_year` / `period_month` explicitly rather than
deriving them from `lesson_date`. That keeps `unique (class, student, year,
month, session_number)` simple, and lets a teacher record a score before the
lesson date is known. This is the one intentional deviation from the schema in
the brief.

---

## Checks

```bash
npx tsc --noEmit           # types
npx eslint src             # lint
npm run dev                # run it
```

---

## Not built yet

Marked as TODO in the code rather than stubbed:

- **CSV / Excel export** on the reports page. The report shape is already flat
  and export-ready; only the encoder is missing.
- **Student dashboard** is intentionally minimal (the brief scopes the MVP to
  admin and teacher). Students can sign in, join with an invite link, and see
  their classes, scores and attendance.
- **Notifications** — the schema carries what a notification would need, but
  nothing is delivered.
- **Phone OTP sign-in.** Google sign-in is wired up and works as soon as the
  provider is enabled in the Supabase dashboard.
