import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canRecordSessions } from "@/lib/permissions";
import { getClassById } from "@/services/class.service";
import { getScoreGrid } from "@/services/lesson.service";
import { currentPeriod, formatPeriod, parsePeriodParam } from "@/lib/utils";
import { ScoreGrid } from "@/components/classes/score-grid";
import { PeriodPicker } from "@/components/classes/period-picker";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClassSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ classId }, query, user] = await Promise.all([params, searchParams, requireAuth()]);
  const period = parsePeriodParam(query.period) ?? currentPeriod();

  const [klass, grid] = await Promise.all([
    getClassById(classId),
    getScoreGrid(classId, period),
  ]);

  if (!klass || !grid) notFound();

  const canEdit = canRecordSessions(user, klass);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{formatPeriod(period)}</h2>
          <p className="text-sm text-ink-muted">
            {canEdit
              ? "Select a session to record a score, attendance, notes and homework."
              : "Scores recorded for this month."}
          </p>
        </div>
        <PeriodPicker />
      </div>

      {grid.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">📋</span>}
          title="No students to score"
          description="Add a student to this class before recording lessons."
        />
      ) : (
        <ScoreGrid grid={grid} period={period} canEdit={canEdit} />
      )}
    </div>
  );
}
