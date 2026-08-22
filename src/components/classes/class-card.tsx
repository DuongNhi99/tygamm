import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, ClassStatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LinkButton } from "@/components/ui/button";
import { CLASS_TYPE_LABELS, type ClassSummary } from "@/types/class";
import { formatScore, scoreTone } from "@/lib/utils";

export function ClassCard({ klass }: { klass: ClassSummary }) {
  return (
    <Card className="flex flex-col gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 truncate text-base font-semibold text-ink">
            <span aria-hidden="true">🎸</span>
            <Link href={`/classes/${klass.id}`} className="truncate hover:text-brand">
              {klass.name}
            </Link>
          </h3>
          <p className="font-mono text-xs tracking-wide text-ink-muted">{klass.code}</p>
        </div>
        <ClassStatusBadge status={klass.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-0.5">
          <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Teacher
          </dt>
          <dd className="truncate text-ink">{klass.teacher_name ?? "Unassigned"}</dd>
        </div>

        <div className="space-y-0.5">
          <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Students
          </dt>
          <dd className="text-ink tabular-nums">
            {klass.student_count} / {klass.max_students}
          </dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-subtle">Lessons this month</span>
          <span className="font-medium text-ink tabular-nums">{klass.progress}%</span>
        </div>
        <ProgressBar value={klass.progress} label={`${klass.name} monthly progress`} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{CLASS_TYPE_LABELS[klass.class_type]}</Badge>
          {klass.average_score !== null && (
            <Badge tone={scoreTone(klass.average_score)}>
              Avg {formatScore(klass.average_score)}
            </Badge>
          )}
        </div>

        <LinkButton href={`/classes/${klass.id}`} variant="outline" size="sm" className="shrink-0">
          View class
        </LinkButton>
      </div>
    </Card>
  );
}
