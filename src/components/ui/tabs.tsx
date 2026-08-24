"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabItem {
  href: string;
  label: string;
}


/**
 * Link-based tabs. Each tab is a real route, so deep links work and each
 * panel stays a Server Component that fetches only its own data.
 */
export function Tabs({
  items,
  label,
  className,
}: {
  items: TabItem[];
  /** Names the tab set for screen readers, in the reader's language. */
  label: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <nav
        className="flex min-w-max gap-1 border-b border-line"
        aria-label={label}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
