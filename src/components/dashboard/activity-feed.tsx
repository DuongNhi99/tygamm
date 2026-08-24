"use client";

import { BookOpen, PencilLine, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { interpolate, type Dictionary } from "@/lib/i18n/translate";
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

/**
 * Builds one feed line from its parts.
 *
 * The service hands over names, not a sentence, because "X joined Y" puts
 * its pieces in a different order in each of the three locales — only the
 * dictionary knows where they go.
 */
function messageFor(item: ActivityItem, dict: Dictionary): string {
  const student = item.student ?? dict.dashboard.activityAStudent;
  const className = item.className ?? dict.dashboard.activityAClass;

  switch (item.kind) {
    case "score":
      return interpolate(dict.dashboard.activityScore, { student, class: className });
    case "join":
      return interpolate(dict.dashboard.activityJoin, {
        student: item.student ?? dict.dashboard.activityAStudentCapitalised,
        class: className,
      });
    case "class":
      return interpolate(dict.dashboard.activityClass, {
        code: item.classCode ?? "",
        name: className,
      });
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const { dict, fmt } = useI18n();

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">{dict.dashboard.noActivity}</p>;
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
              <p className="text-sm text-ink">{messageFor(item, dict)}</p>
              <time dateTime={item.at} className="text-xs text-ink-subtle">
                {fmt.formatRelativeTime(item.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
