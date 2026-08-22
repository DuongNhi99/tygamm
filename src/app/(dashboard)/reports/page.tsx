import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, Percent, Star } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getClassReport, listStudentOptions } from "@/services/report.service";
import { listClassOptions } from "@/services/class.service";
import { listTeacherOptions } from "@/services/teacher.service";
import { currentPeriod, formatPercent, formatPeriod, formatScore, parsePeriodParam } from "@/lib/utils";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableWrapper } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { PeriodPicker } from "@/components/classes/period-picker";
import { scoreTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireStaff()]);

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const period = parsePeriodParam(single("period")) ?? currentPeriod();
  const classId = single("class");

  const [report, classes, teachers, students] = await Promise.all([
    getClassReport({
      year: period.year,
      month: period.month,
      teacherId: isAdmin(user) ? single("teacher") : undefined,
      classId,
      studentId: single("student"),
    }),
    listClassOptions(),
    isAdmin(user) ? listTeacherOptions() : Promise.resolve([]),
    listStudentOptions(classId),
  ]);

  const rows = report.rows.filter((row) => row.student_count > 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Monthly summary for ${formatPeriod(period)}.`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PeriodPicker />

          {isAdmin(user) && (
            <FilterSelect
              paramKey="teacher"
              label="Filter by teacher"
              allLabel="All teachers"
              options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
            />
          )}

          <FilterSelect
            paramKey="class"
            label="Filter by class"
            allLabel="All classes"
            options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          />

          <FilterSelect
            paramKey="student"
            label="Filter by student"
            allLabel="All students"
            options={students.map((s) => ({ value: s.id, label: s.full_name }))}
          />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Classes"
          value={report.totals.classes}
          hint={`${report.totals.students} students`}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Lessons"
          value={report.totals.lessons}
          hint={formatPeriod(period)}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Average score"
          value={formatScore(report.totals.average_score)}
          hint="out of 10"
          icon={<Star className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Attendance"
          value={formatPercent(report.totals.attendance_rate, 1)}
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true">📊</span>}
            title="Nothing recorded for this month"
            description="Once lessons are marked with attendance or a score, they appear in this report."
          />
        ) : (
          <>
            <TableWrapper className="hidden md:block">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Class</TH>
                    <TH>Teacher</TH>
                    <TH className="text-center">Students</TH>
                    <TH className="text-center">Lessons</TH>
                    <TH>Average</TH>
                    <TH>Attendance</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <TR key={row.class_id}>
                      <TD>
                        <Link
                          href={`/classes/${row.class_id}`}
                          className="font-medium hover:text-brand"
                        >
                          {row.class_name}
                        </Link>
                        <span className="block font-mono text-xs text-ink-subtle">
                          {row.class_code}
                        </span>
                      </TD>
                      <TD className="text-ink-muted">{row.teacher_name ?? "Unassigned"}</TD>
                      <TD className="text-center tabular-nums">{row.student_count}</TD>
                      <TD className="text-center tabular-nums">{row.lessons_recorded}</TD>
                      <TD>
                        <Badge tone={scoreTone(row.average_score)}>
                          {formatScore(row.average_score)}
                        </Badge>
                      </TD>
                      <TD className="tabular-nums">{formatPercent(row.attendance_rate, 1)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>

            <ul className="space-y-3 md:hidden">
              {rows.map((row) => (
                <li key={row.class_id}>
                  <Card className="space-y-3 p-4">
                    <div>
                      <Link
                        href={`/classes/${row.class_id}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {row.class_name}
                      </Link>
                      <p className="font-mono text-xs text-ink-subtle">{row.class_code}</p>
                      <p className="text-sm text-ink-muted">
                        {row.teacher_name ?? "Unassigned"}
                      </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                      <div>
                        <dt className="text-xs text-ink-subtle">Students</dt>
                        <dd className="mt-0.5 tabular-nums">{row.student_count}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">Lessons</dt>
                        <dd className="mt-0.5 tabular-nums">{row.lessons_recorded}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">Average</dt>
                        <dd className="mt-0.5">
                          <Badge tone={scoreTone(row.average_score)}>
                            {formatScore(row.average_score)}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">Attendance</dt>
                        <dd className="mt-0.5 tabular-nums">
                          {formatPercent(row.attendance_rate, 1)}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </li>
              ))}
            </ul>

            {/* TODO: CSV / Excel export (§27). The report shape above is
                already flat and export-ready — only the encoder is missing. */}
          </>
        )}
      </div>
    </>
  );
}
