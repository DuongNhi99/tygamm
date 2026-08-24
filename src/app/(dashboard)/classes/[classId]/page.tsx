import { notFound } from "next/navigation";
import { CalendarCheck, Percent, Star, Users } from "lucide-react";
import { getClassById } from "@/services/class.service";
import { listClassStudents } from "@/services/student.service";
import { currentPeriod, formatPercent, formatScore, roundTo } from "@/lib/utils";
import { getI18n } from "@/lib/i18n/server";
import { interpolate, plural } from "@/lib/i18n/translate";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export default async function ClassOverviewPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const period = currentPeriod();

  const [klass, students, { dict, fmt }] = await Promise.all([
    getClassById(classId),
    listClassStudents(classId, period),
    getI18n(),
  ]);

  if (!klass) notFound();

  const active = students.filter((s) => s.member_status === "ACTIVE");
  const scores = active.map((s) => s.average_score).filter((s): s is number => s !== null);
  const rates = active.map((s) => s.attendance_rate).filter((r): r is number => r !== null);

  const mean = (values: number[]) =>
    values.length > 0 ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;

  const lessonsRecorded = active.reduce((sum, s) => sum + s.lessons_completed, 0);
  const lessonCapacity = active.length * klass.sessions_per_month;
  const progress = lessonCapacity > 0 ? (lessonsRecorded / lessonCapacity) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dict.common.students}
          value={`${active.length} / ${klass.max_students}`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label={dict.dashboard.lessonsThisMonth}
          value={`${lessonsRecorded} / ${lessonCapacity}`}
          hint={fmt.formatPeriod(period)}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={dict.dashboard.averageScore}
          value={formatScore(mean(scores))}
          hint={dict.common.outOf10}
          icon={<Star className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label={dict.common.attendance}
          value={formatPercent(mean(rates), 1)}
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.classes.monthlyProgress}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">
                {plural(
                  {
                    one: dict.classes.lessonsAcross_one,
                    other: dict.classes.lessonsAcross_other,
                  },
                  active.length,
                )}
              </span>
              <span className="text-2xl font-semibold text-ink tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <ProgressBar value={progress} label={dict.classes.classMonthlyProgress} />
            <p className="text-xs text-ink-subtle">
              {interpolate(dict.classes.lessonsPerStudentPerMonth, {
                count: klass.sessions_per_month,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.classes.details}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <dl className="divide-y divide-line text-sm">
              <Row label={dict.classes.classType}>
                {dict.classTypes.labels[klass.class_type]}
                <span className="block text-xs text-ink-subtle">
                  {dict.classTypes.descriptions[klass.class_type]}
                </span>
              </Row>
              <Row label={dict.classes.classCode}>
                <span className="font-mono tracking-wide">{klass.code}</span>
              </Row>
              <Row label={dict.common.teacher}>
                {klass.teacher_name ?? dict.common.unassigned}
              </Row>
              <Row label={dict.classes.lessonsPerMonth}>{klass.sessions_per_month}</Row>
              <Row label={dict.classes.startDate}>{fmt.formatDate(klass.start_date)}</Row>
              <Row label={dict.classes.created}>{fmt.formatDate(klass.created_at)}</Row>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
