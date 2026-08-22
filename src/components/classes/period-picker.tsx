"use client";

import { useTransition } from "react";
import { useQueryParams } from "@/hooks/use-query-params";
import { Select } from "@/components/ui/field";
import { formatPeriod, periodToParam, recentPeriods } from "@/lib/utils";

/** Month selector, backed by the `period` query parameter (`2026-08`). */
export function PeriodPicker({ months = 12 }: { months?: number }) {
  const { searchParams, setParams } = useQueryParams();
  const [isPending, startTransition] = useTransition();

  const periods = recentPeriods(months);
  const current = searchParams.get("period") ?? periodToParam(periods[0]);

  return (
    <label className="w-full sm:w-52">
      <span className="sr-only">Month</span>
      <Select
        value={current}
        disabled={isPending}
        aria-label="Month"
        onChange={(event) =>
          startTransition(() => setParams({ period: event.target.value, page: null }))
        }
      >
        {periods.map((period) => {
          const value = periodToParam(period);
          return (
            <option key={value} value={value}>
              {formatPeriod(period)}
            </option>
          );
        })}
      </Select>
    </label>
  );
}
