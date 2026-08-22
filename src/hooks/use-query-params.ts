"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters and pagination live in the URL, not React state: the result is
 * shareable, back-button friendly, and lets the pages stay Server Components
 * that read `searchParams` (§61).
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      }

      // Any filter change invalidates the current page number.
      if (!("page" in updates)) params.delete("page");

      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      router.replace(buildHref(updates), { scroll: false });
    },
    [buildHref, router],
  );

  return { searchParams, setParams, buildHref };
}
