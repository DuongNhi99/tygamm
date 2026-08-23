import Link from "next/link";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav, MobileDrawer } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import type { SessionUser } from "@/types/auth";

/**
 * Desktop: fixed sidebar + content. Mobile: top bar with a drawer, plus a
 * bottom bar for the primary destinations (§9, §51).
 *
 * A Server Component — only the interactive pieces inside it are client
 * components, so the dashboard is not wholesale client-rendered (§43).
 */
export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const role = user.profile.role;

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-brand px-4 py-2 text-brand-ink focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="Tygamm dashboard">
            <Logo />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <SidebarNav role={role} />
        </div>

        <div className="border-t border-line px-4 py-4">
          <ThemeToggle />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-card/90 px-4 backdrop-blur sm:px-6">
          <MobileDrawer role={role} />

          <Link href="/dashboard" className="lg:hidden" aria-label="Tygamm dashboard">
            <Logo showText={false} />
          </Link>

          <span className="flex-1" />

          <UserMenu profile={user.profile} />
        </header>

        <main
          id="main-content"
          // Bottom padding clears the mobile bottom bar.
          className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <BottomNav role={role} />
    </div>
  );
}

/** Consistent page heading used across the dashboard routes. */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description && <p className="text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
