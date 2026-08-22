"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseConfigured } from "./env";
import type { Database } from "@/types/database";

/**
 * Browser client. Only used for auth flows that must run in the browser
 * (sign in, password reset, sign out) — all data access happens on the
 * server, so this client never becomes a second, weaker data path.
 */
export function createClient() {
  assertSupabaseConfigured();
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
