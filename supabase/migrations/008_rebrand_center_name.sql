-- =====================================================================
-- 008_rebrand_center_name.sql — AbbaGuitar renamed to Tygamm
-- =====================================================================
-- 006 shipped the old brand as the column default and seeded row 1 with
-- it. Only rows still holding that default are touched, so a centre that
-- has since set its own name in the settings page keeps it.
alter table public.app_settings
  alter column center_name set default 'Tygamm';

update public.app_settings
   set center_name = 'Tygamm'
 where center_name = 'AbbaGuitar';
