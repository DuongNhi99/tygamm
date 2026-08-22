import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses Row Level Security completely, so it exists
 * for exactly one job: creating auth accounts for teachers and students that
 * an admin adds from the dashboard (the Auth Admin API has no user-level
 * equivalent).
 *
 * `server-only` above makes importing this from a Client Component a build
 * error rather than a leaked key.
 *
 * Every caller must do its own authorization check first — see
 * `requireAdmin()` in lib/auth.
 */
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasServiceRole =
  SERVICE_ROLE_KEY.length > 0 && !/your-service-role-key/i.test(SERVICE_ROLE_KEY);

export function createAdminClient() {
  if (!hasServiceRole) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required to create teacher " +
        "and student accounts. Add it to .env.local (server-side only).",
    );
  }

  return createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
