"use client";

import { useTransition } from "react";
import { useQueryParams } from "@/hooks/use-query-params";
import { Select } from "@/components/ui/field";
import { periodToParam, recentPeriods } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/** Month selector, backed by the `period` query parameter (`2026-08`). */
export function PeriodPicker({ months = 12 }: { months?: number }) {
  const { searchParams, setParams } = useQueryParams();
  const { dict, fmt } = useI18n();
  const [isPending, startTransition] = useTransition();

  const periods = recentPeriods(months);
  const current = searchParams.get("period") ?? periodToParam(periods[0]);

  return (
    <label className="w-full sm:w-52">
      <span className="sr-only">{dict.common.month}</span>
      <Select
        value={current}
        disabled={isPending}
        aria-label={dict.common.month}
        onChange={(event) =>
          startTransition(() => setParams({ period: event.target.value, page: null }))
        }
      >
        {periods.map((period) => {
          const value = periodToParam(period);
          return (
            <option key={value} value={value}>
              {fmt.formatPeriod(period)}
            </option>
          );
        })}
      </Select>
    </label>
  );
}
