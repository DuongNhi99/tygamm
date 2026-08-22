-- =====================================================================
-- 006_app_settings.sql — single-row application settings (admin managed)
-- =====================================================================
create table if not exists public.app_settings (
  id                         smallint primary key default 1 check (id = 1),
  center_name                text        not null default 'AbbaGuitar',
  default_sessions_per_month integer     not null default 8
                                         check (default_sessions_per_month between 1 and 31),
  updated_at                 timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
