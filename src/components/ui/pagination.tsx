"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryParams } from "@/hooks/use-query-params";
import { cn } from "@/lib/utils";
import { useDict } from "@/lib/i18n/client";
import { interpolate, plural } from "@/lib/i18n/translate";

/**
 * Server-side pagination (§41): each control is a link that changes the
 * `page` parameter, so the page re-queries instead of the browser holding
 * every row in memory.
 */
export function Pagination({
  page,
  pageCount,
  total,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  className?: string;
}) {
  const { buildHref } = useQueryParams();
  const dict = useDict();
  if (pageCount <= 1) return null;

  const pages = pageNumbers(page, pageCount);

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      aria-label={dict.pagination.label}
    >
      <p className="text-sm text-ink-muted">
        {plural(
          { one: dict.pagination.summary_one, other: dict.pagination.summary_other },
          total,
          { page, pageCount, total },
        )}
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={buildHref({ page: page - 1 })}
          disabled={page <= 1}
          label={dict.pagination.previous}
        >
          <ChevronLeft className="h-4 w-4" />
        </PageLink>

        {pages.map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="px-2 text-ink-subtle" aria-hidden="true">
              …
            </span>
          ) : (
            <PageLink
              key={entry}
              href={buildHref({ page: entry })}
              current={entry === page}
              label={interpolate(dict.pagination.page, { page: entry })}
            >
              {entry}
            </PageLink>
          ),
        )}

        <PageLink
          href={buildHref({ page: page + 1 })}
          disabled={page >= pageCount}
          label={dict.pagination.next}
        >
          <ChevronRight className="h-4 w-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  children,
  disabled,
  current,
  label,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
    current ? "bg-brand text-brand-ink" : "text-ink-muted hover:bg-muted hover:text-ink",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

/** Window of page numbers around the current page, with gaps for the rest. */
function pageNumbers(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const result: Array<number | "gap"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) result.push("gap");
  for (let i = start; i <= end; i++) result.push(i);
  if (end < pageCount - 1) result.push("gap");

  result.push(pageCount);
  return result;
}
