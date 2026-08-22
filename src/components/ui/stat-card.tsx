import * as React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "brand",
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl border border-line bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        {hint && <p className="text-xs text-ink-subtle">{hint}</p>}
      </div>

      {icon && (
        <span
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone])}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
    </div>
  );
}
