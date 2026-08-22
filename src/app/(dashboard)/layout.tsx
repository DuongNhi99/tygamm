import { requireAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Every page under this layout renders one specific user's data, so none of
 * it may ever be prerendered or shared. Applies to all nested segments.
 *
 * Without this, a build run with no Supabase credentials short-circuits
 * before `cookies()` is read and Next happily marks these routes static.
 */
export const dynamic = "force-dynamic";

/**
 * Every dashboard route passes through here, so an unauthenticated or
 * deactivated visitor is stopped once, in one place. The proxy already
 * redirected them — this is the check that actually counts, since proxy
 * matching can be bypassed but a layout cannot.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
