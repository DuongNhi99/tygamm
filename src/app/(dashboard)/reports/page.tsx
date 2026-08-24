import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, Percent, Star } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getClassReport, listStudentOptions } from "@/services/report.service";
import { listClassOptions } from "@/services/class.service";
import { listTeacherOptions } from "@/services/teacher.service";
import { currentPeriod, formatPercent, formatScore, parsePeriodParam } from "@/lib/utils";
import { getI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableWrapper } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { PeriodPicker } from "@/components/classes/period-picker";
import { scoreTone } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.reports.meta };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user, { dict, fmt }] = await Promise.all([
    searchParams,
    requireStaff(),
    getI18n(),
  ]);

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
  const periodLabel = fmt.formatPeriod(period);

  return (
    <>
      <PageHeader
        title={dict.reports.title}
        description={interpolate(dict.reports.subtitle, { period: periodLabel })}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PeriodPicker />

          {isAdmin(user) && (
            <FilterSelect
              paramKey="teacher"
              label={dict.classes.filterTeacher}
              allLabel={dict.classes.allTeachers}
              options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
            />
          )}

          <FilterSelect
            paramKey="class"
            label={dict.students.filterClass}
            allLabel={dict.students.allClasses}
            options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          />

          <FilterSelect
            paramKey="student"
            label={dict.reports.filterStudent}
            allLabel={dict.reports.allStudents}
            options={students.map((s) => ({ value: s.id, label: s.full_name }))}
          />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dict.common.classes}
          value={report.totals.classes}
          hint={interpolate(dict.reports.studentsHint, { count: report.totals.students })}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label={dict.common.lessons}
          value={report.totals.lessons}
          hint={periodLabel}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={dict.dashboard.averageScore}
          value={formatScore(report.totals.average_score)}
          hint={dict.common.outOf10}
          icon={<Star className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label={dict.common.attendance}
          value={formatPercent(report.totals.attendance_rate, 1)}
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true">📊</span>}
            title={dict.reports.noneTitle}
            description={dict.reports.noneBody}
          />
        ) : (
          <>
            <TableWrapper className="hidden md:block">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{dict.reports.columnClass}</TH>
                    <TH>{dict.common.teacher}</TH>
                    <TH className="text-center">{dict.common.students}</TH>
                    <TH className="text-center">{dict.common.lessons}</TH>
                    <TH>{dict.common.average}</TH>
                    <TH>{dict.common.attendance}</TH>
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
                      <TD className="text-ink-muted">
                        {row.teacher_name ?? dict.common.unassigned}
                      </TD>
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
                        {row.teacher_name ?? dict.common.unassigned}
                      </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                      <div>
                        <dt className="text-xs text-ink-subtle">{dict.common.students}</dt>
                        <dd className="mt-0.5 tabular-nums">{row.student_count}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">{dict.common.lessons}</dt>
                        <dd className="mt-0.5 tabular-nums">{row.lessons_recorded}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">{dict.common.average}</dt>
                        <dd className="mt-0.5">
                          <Badge tone={scoreTone(row.average_score)}>
                            {formatScore(row.average_score)}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">{dict.common.attendance}</dt>
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
