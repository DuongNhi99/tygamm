import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canRecordSessions } from "@/lib/permissions";
import { getClassById } from "@/services/class.service";
import { getScoreGrid } from "@/services/lesson.service";
import { currentPeriod, parsePeriodParam } from "@/lib/utils";
import { getI18n } from "@/lib/i18n/server";
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
  const [{ classId }, query, user, { dict, fmt }] = await Promise.all([
    params,
    searchParams,
    requireAuth(),
    getI18n(),
  ]);
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
          <h2 className="text-lg font-semibold text-ink">{fmt.formatPeriod(period)}</h2>
          <p className="text-sm text-ink-muted">
            {canEdit
              ? dict.classes.sessions.canEditHint
              : dict.classes.sessions.readOnlyHint}
          </p>
        </div>
        <PeriodPicker />
      </div>

      {grid.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">📋</span>}
          title={dict.classes.sessions.noStudentsTitle}
          description={dict.classes.sessions.noStudentsBody}
        />
      ) : (
        <ScoreGrid grid={grid} period={period} canEdit={canEdit} />
      )}
    </div>
  );
}
