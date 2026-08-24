"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { useQueryParams } from "@/hooks/use-query-params";
import { cn } from "@/lib/utils";
import { useDict } from "@/lib/i18n/client";
import { Spinner } from "./button";

/**
 * Debounced search that writes to the URL, so the Server Component page
 * re-runs the query rather than the browser filtering a preloaded list.
 */
export function SearchInput({
  paramKey = "q",
  placeholder,
  className,
  label,
}: {
  paramKey?: string;
  placeholder?: string;
  className?: string;
  label?: string;
}) {
  const { searchParams, setParams } = useQueryParams();
  const dict = useDict();
  const hint = placeholder ?? dict.search.placeholder;
  const urlValue = searchParams.get(paramKey) ?? "";
  const [value, setValue] = useState(urlValue);
  const [isPending, startTransition] = useTransition();

  // Re-sync when the URL changes from elsewhere (back button, cleared
  // filters). Adjusted during render rather than in an effect, so the input
  // never paints one frame of the stale value.
  const [lastUrlValue, setLastUrlValue] = useState(urlValue);
  if (lastUrlValue !== urlValue) {
    setLastUrlValue(urlValue);
    setValue(urlValue);
  }

  useEffect(() => {
    if (value === urlValue) return;

    const timer = setTimeout(() => {
      startTransition(() => setParams({ [paramKey]: value || null }));
    }, 350);

    return () => clearTimeout(timer);
  }, [value, urlValue, paramKey, setParams]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-subtle"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={hint}
        aria-label={label ?? hint}
        className={cn(
          "h-11 w-full rounded-xl border border-line bg-card pr-10 pl-9 text-sm text-ink",
          "placeholder:text-ink-subtle focus:border-brand focus:outline-none",
        )}
      />
      <span className="absolute top-1/2 right-3 -translate-y-1/2">
        {isPending ? (
          <Spinner className="text-ink-subtle" />
        ) : value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label={dict.search.clear}
            className="text-ink-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
