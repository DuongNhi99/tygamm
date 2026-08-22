import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, SessionUser } from "@/types/auth";
import type { Role } from "@/types/database";

/**
 * The signed-in user plus their profile row.
 *
 * Wrapped in React's `cache` so a page that checks auth in the layout, the
 * page and two components still costs one round trip per render.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();

  // getUser() verifies the JWT against Supabase. Never trust getSession()
  // for authorization — it only decodes the cookie.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) return null;

  return { id: user.id, email: user.email ?? null, profile };
});

/** Signed-in user, or a redirect to the login page. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // A deactivated account keeps its valid token until it expires, so the
  // status check has to happen on every request, not just at sign-in.
  if (user.profile.status !== "ACTIVE") redirect("/login?error=inactive");

  return user;
}

/**
 * Signed-in user holding one of `roles`.
 *
 * Convenience and UX, not security: a user who forges their way past this
 * still hits the RLS policies, which allow them nothing extra.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.profile.role)) redirect("/dashboard?error=forbidden");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

/** Admins and teachers — the two roles that manage classes day to day. */
export async function requireStaff(): Promise<SessionUser> {
  return requireRole("ADMIN", "TEACHER");
}
