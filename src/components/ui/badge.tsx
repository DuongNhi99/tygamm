"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDict } from "@/lib/i18n/client";
import type { Attendance, ClassStatus, UserStatus } from "@/types/database";
import { ATTENDANCE_TONES } from "@/types/lesson";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-ink-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

const CLASS_STATUS_TONES: Record<ClassStatus, Tone> = {
  ACTIVE: "success",
  INACTIVE: "warning",
  ARCHIVED: "neutral",
};

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  const dict = useDict();
  return <Badge tone={CLASS_STATUS_TONES[status]}>{dict.classStatus[status]}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const dict = useDict();
  return (
    <Badge tone={status === "ACTIVE" ? "success" : "neutral"}>
      {status === "ACTIVE" ? dict.common.active : dict.common.inactive}
    </Badge>
  );
}

export function AttendanceBadge({ attendance }: { attendance: Attendance | null }) {
  const dict = useDict();
  if (!attendance) return <Badge tone="neutral">{dict.common.notRecorded}</Badge>;
  return <Badge tone={ATTENDANCE_TONES[attendance]}>{dict.attendance[attendance]}</Badge>;
}
