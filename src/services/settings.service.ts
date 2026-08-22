import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AppSettingsRow } from "@/types/database";
import type { AppSettingsInput, ProfileInput } from "@/lib/validations";

const FALLBACK: AppSettingsRow = {
  id: 1,
  center_name: "AbbaGuitar",
  default_sessions_per_month: 8,
  updated_at: new Date().toISOString(),
};

/** Single-row settings table. Falls back to defaults if it is unreachable. */
export async function getAppSettings(): Promise<AppSettingsRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();

  if (error || !data) return FALLBACK;
  return data as AppSettingsRow;
}

export async function updateAppSettings(input: AppSettingsInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      center_name: input.center_name,
      default_sessions_per_month: input.default_sessions_per_month,
    })
    .eq("id", 1);

  if (error) throw error;
}

/** A user editing their own profile — never their role or status. */
export async function updateOwnProfile(userId: string, input: ProfileInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      avatar_url: input.avatar_url,
    })
    .eq("id", userId);

  if (error) throw error;
}
