-- =====================================================================
-- 009_profile_locale.sql — remember each account's interface language
-- =====================================================================
-- The locale that actually drives rendering lives in a cookie, so signed-out
-- pages (login, the public /join invite) can be translated too. This column
-- is the durable copy: it re-seeds that cookie at sign-in, so the choice
-- follows the user to a new browser or device instead of being per-machine.
--
-- Nullable on purpose. NULL means "never chose", which is different from
-- "chose English" — the first is still open to the Accept-Language guess.
alter table public.profiles
  add column if not exists locale text
    check (locale is null or locale in ('en', 'vi', 'zh-CN'));

comment on column public.profiles.locale is
  'Preferred interface language. NULL = not chosen; fall back to Accept-Language.';

-- The existing "update own profile" policy from 007 already covers this
-- column: it is scoped to the row, not to a column list. Role and status
-- stay protected by the same trigger, which this column is not part of.
