"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDict } from "@/lib/i18n/client";
import { primaryNavForRole } from "./nav-config";
import type { Role } from "@/types/database";

/**
 * Bottom bar for the primary destinations. Sits above the safe area so it
 * clears the home indicator on modern phones.
 *
 * This is the whole of navigation on a phone — there is no hamburger drawer
 * duplicating it (§51), so every destination a role can reach must be
 * reachable from here or from the account menu.
 */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const dict = useDict();
  const items = primaryNavForRole(role);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)] lg:hidden",
      )}
      aria-label={dict.nav.primary}
    >
      <ul className="flex">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium",
                  active ? "text-brand" : "text-ink-muted",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="w-full truncate text-center">{dict.nav[item.labelKey]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
