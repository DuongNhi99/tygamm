"use client";

import { useTransition } from "react";
import { useQueryParams } from "@/hooks/use-query-params";
import { Select } from "./field";

/** A <select> that drives a URL query parameter. */
export function FilterSelect({
  paramKey,
  label,
  options,
  allLabel = "All",
  className,
}: {
  paramKey: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
  className?: string;
}) {
  const { searchParams, setParams } = useQueryParams();
  const [isPending, startTransition] = useTransition();
  const value = searchParams.get(paramKey) ?? "";

  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <Select
        value={value}
        disabled={isPending}
        aria-label={label}
        onChange={(event) =>
          startTransition(() => setParams({ [paramKey]: event.target.value || null }))
        }
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
