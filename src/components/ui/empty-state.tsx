import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Empty states explain the next step rather than just reporting emptiness
 * (§37), so every one takes an action where an action exists.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line",
        "bg-card px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="text-3xl text-ink-subtle">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
