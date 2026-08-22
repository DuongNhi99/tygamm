import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassById } from "@/services/class.service";
import { getScoreGrid } from "@/services/lesson.service";
import { currentPeriod, formatPercent, formatPeriod, formatScore, parsePeriodParam, roundTo } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodPicker } from "@/components/classes/period-picker";
import { SessionTrendChart } from "@/components/progress/session-trend-chart";
import { scoreTone } from "@/lib/utils";

export default async function ClassProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ classId }, query] = await Promise.all([params, searchParams]);
  const period = parsePeriodParam(query.period) ?? currentPeriod();

  const [klass, grid] = await Promise.all([getClassById(classId), getScoreGrid(classId, period)]);
  if (!klass || !grid) notFound();

  // Class average per session: the mean of every student's score for that
  // session, skipping sessions nobody has been graded on yet.
  const sessionAverages = Array.from({ length: grid.sessions_per_month }, (_, index) => {
    const number = index + 1;
    const scores = grid.rows
      .map((row) => row.sessions[number]?.score)
      .filter((score): score is number => score !== null && score !== undefined);

    return {
      session: number,
      score: scores.length > 0 ? roundTo(scores.reduce((a, b) => a + b, 0) / scores.length, 2) : null,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Progress · {formatPeriod(period)}</h2>
        <PeriodPicker />
      </div>

      {grid.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">📈</span>}
          title="No progress to show"
          description="Add students and record lessons to see progress here."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Class average by session</CardTitle>
                <p className="text-sm text-ink-muted">Mean score across all students</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <SessionTrendChart data={sessionAverages} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {grid.rows.map((row) => {
              const progress =
                grid.sessions_per_month > 0
                  ? (row.lessons_completed / grid.sessions_per_month) * 100
                  : 0;

              return (
                <Card key={row.student_id} className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.full_name} src={row.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${row.student_id}`}
                        className="block truncate font-medium text-ink hover:text-brand"
                      >
                        {row.full_name}
                      </Link>
                      <p className="text-sm text-ink-muted">
                        Attendance {formatPercent(row.attendance_rate, 1)}
                      </p>
                    </div>
                    <Badge tone={scoreTone(row.average_score)}>
                      {formatScore(row.average_score)}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-subtle">Lessons completed</span>
                      <span className="font-medium text-ink tabular-nums">
                        {row.lessons_completed} / {grid.sessions_per_month}
                      </span>
                    </div>
                    <ProgressBar value={progress} label={`${row.full_name} lessons completed`} />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
