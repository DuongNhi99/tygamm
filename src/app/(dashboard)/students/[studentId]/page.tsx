import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Percent, Star } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getStudent, listStudentClasses } from "@/services/student.service";
import { listStudentNotes, listStudentProgress, listStudentSessions } from "@/services/lesson.service";
import {
  MONTH_NAMES,
  currentPeriod,
  formatPercent,
  formatPeriod,
  formatScore,
  parsePeriodParam,
  roundTo,
} from "@/lib/utils";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { AttendanceBadge, Badge, UserStatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodPicker } from "@/components/classes/period-picker";
import { SessionTrendChart } from "@/components/progress/session-trend-chart";
import { scoreTone } from "@/lib/utils";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  await requireStaff();

  const period = parsePeriodParam(query.period) ?? currentPeriod();

  // RLS hides students a teacher does not teach, so this 404s for them too.
  const student = await getStudent(studentId);
  if (!student) notFound();

  const [classes, progress, notes] = await Promise.all([
    listStudentClasses(studentId),
    listStudentProgress(studentId, 6),
    listStudentNotes(studentId, 8),
  ]);

  const periodProgress = progress.filter(
    (row) => row.year === period.year && row.month === period.month,
  );

  const mean = (values: number[]) =>
    values.length > 0 ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;

  const averageScore = mean(
    periodProgress.map((p) => p.average_score).filter((s): s is number => s !== null).map(Number),
  );
  const attendanceRate = mean(
    periodProgress.map((p) => p.attendance_rate).filter((s): s is number => s !== null).map(Number),
  );
  const lessonsCompleted = periodProgress.reduce((sum, p) => sum + p.lessons_completed, 0);
  const lessonCapacity = classes.reduce((sum, c) => sum + c.sessions_per_month, 0);

  // Month-over-month comparison (§23), oldest first.
  const monthly = [...progress]
    .reduce<Array<{ key: string; year: number; month: number; scores: number[] }>>((acc, row) => {
      const key = `${row.year}-${row.month}`;
      const existing = acc.find((entry) => entry.key === key);
      if (existing) {
        if (row.average_score !== null) existing.scores.push(Number(row.average_score));
      } else {
        acc.push({
          key,
          year: row.year,
          month: row.month,
          scores: row.average_score !== null ? [Number(row.average_score)] : [],
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

  const sessionsByClass = await Promise.all(
    classes.map(async (klass) => ({
      klass,
      sessions: await listStudentSessions(klass.id, studentId, period),
    })),
  );

  return (
    <>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All students
      </Link>

      <PageHeader
        title={student.full_name}
        description={[student.email, student.phone].filter(Boolean).join(" · ") || undefined}
        actions={<PeriodPicker />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={student.full_name} src={student.avatar_url} size="lg" />
          <div className="flex flex-wrap items-center gap-2">
            <UserStatusBadge status={student.status} />
            {classes.map((klass) => (
              <Link key={klass.id} href={`/classes/${klass.id}`}>
                <Badge tone="brand">{klass.name}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Average score"
          value={formatScore(averageScore)}
          hint={`out of 10 · ${formatPeriod(period)}`}
          icon={<Star className="h-5 w-5" />}
        />
        <StatCard
          label="Attendance"
          value={formatPercent(attendanceRate, 1)}
          icon={<Percent className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Lessons completed"
          value={lessonCapacity > 0 ? `${lessonsCompleted} / ${lessonCapacity}` : lessonsCompleted}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Scores this month</CardTitle>
              <p className="text-sm text-ink-muted">{formatPeriod(period)}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {sessionsByClass.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                This student is not in a class yet.
              </p>
            ) : (
              sessionsByClass.map(({ klass, sessions }) => {
                const points = Array.from({ length: klass.sessions_per_month }, (_, index) => {
                  const number = index + 1;
                  const session = sessions.find((s) => s.session_number === number);
                  return { session: number, score: session?.score ?? null };
                });

                return (
                  <div key={klass.id} className="space-y-2">
                    <h3 className="text-sm font-medium text-ink">{klass.name}</h3>
                    <SessionTrendChart data={points} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly comparison</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {monthly.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No history yet.</p>
            ) : (
              <ol className="space-y-3">
                {monthly.map((entry) => {
                  const average = mean(entry.scores);
                  const tone = scoreTone(average);
                  return (
                    <li key={entry.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-ink-muted">
                          {MONTH_NAMES[entry.month - 1]} {entry.year}
                        </span>
                        <span className="font-medium text-ink tabular-nums">
                          {formatScore(average)}
                        </span>
                      </div>
                      <ProgressBar
                        value={((average ?? 0) / 10) * 100}
                        tone={tone === "neutral" ? "brand" : tone}
                        label={`${MONTH_NAMES[entry.month - 1]} average`}
                      />
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Notes &amp; homework</CardTitle>
            <p className="text-sm text-ink-muted">Most recent lessons first</p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {notes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Teacher notes and homework appear here once they are recorded on a lesson."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ol className="divide-y divide-line">
              {notes.map((note) => (
                <li key={note.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-ink">
                      {MONTH_NAMES[note.period_month - 1]} {note.period_year} · Session{" "}
                      {note.session_number}
                    </span>
                    <AttendanceBadge attendance={note.attendance} />
                    {note.score !== null && (
                      <Badge tone={scoreTone(Number(note.score))}>
                        {formatScore(Number(note.score))}
                      </Badge>
                    )}
                  </div>

                  {note.teacher_note && (
                    <p className="text-sm whitespace-pre-line text-ink">{note.teacher_note}</p>
                  )}
                  {note.homework && (
                    <div className="rounded-xl bg-muted px-3 py-2">
                      <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
                        Homework
                      </p>
                      <p className="mt-0.5 text-sm whitespace-pre-line text-ink">{note.homework}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
