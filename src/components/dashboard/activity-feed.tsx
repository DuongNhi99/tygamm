import { BookOpen, PencilLine, UserPlus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem } from "@/services/dashboard.service";

const ICONS = {
  score: PencilLine,
  join: UserPlus,
  class: BookOpen,
} as const;

const TONES = {
  score: "bg-brand-soft text-brand",
  join: "bg-success-soft text-success",
  class: "bg-warning-soft text-warning",
} as const;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">No activity yet.</p>;
  }

  return (
    <ol className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.kind];
        return (
          <li key={item.id} className="flex gap-3 rounded-xl px-1 py-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[item.kind]}`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-ink">{item.message}</p>
              <time dateTime={item.at} className="text-xs text-ink-subtle">
                {formatRelativeTime(item.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
