/**
 * Only the two public values live here — they are inlined into the browser
 * bundle by design. The service-role key is read exclusively in
 * `lib/supabase/admin.ts`, which is marked server-only.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Values still carrying the `.env.example` defaults count as "not set up". */
const PLACEHOLDER = /your-project-ref|your-anon-key|your-service-role-key/i;

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 &&
  SUPABASE_ANON_KEY.length > 0 &&
  !PLACEHOLDER.test(SUPABASE_URL) &&
  !PLACEHOLDER.test(SUPABASE_ANON_KEY);

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !PLACEHOLDER.test(configured)) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}
