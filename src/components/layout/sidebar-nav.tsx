"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDict } from "@/lib/i18n/client";
import { navGroupsForRole } from "./nav-config";
import type { Role } from "@/types/database";

/** A nav link is active for its own route and anything nested beneath it. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  role,
  onNavigate,
  className,
}: {
  role: Role;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const dict = useDict();
  const groups = navGroupsForRole(role);

  return (
    <nav className={cn("space-y-6", className)} aria-label={dict.nav.main}>
      {groups.map((group, index) => (
        <div key={group.labelKey ?? `group-${index}`} className="space-y-1">
          {group.labelKey && (
            <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-ink-subtle uppercase">
              {dict.nav[group.labelKey]}
            </p>
          )}

          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-ink-muted hover:bg-muted hover:text-ink",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {dict.nav[item.labelKey]}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
