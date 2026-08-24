import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canRecordSessions } from "@/lib/permissions";
import { getClassById } from "@/services/class.service";
import { listClassStudents } from "@/services/student.service";
import { currentPeriod, parsePeriodParam } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";
import { ClassStudents } from "@/components/classes/class-students";
import { PeriodPicker } from "@/components/classes/period-picker";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClassStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ classId }, query, user, dict] = await Promise.all([
    params,
    searchParams,
    requireAuth(),
    getDictionary(),
  ]);
  const period = parsePeriodParam(query.period) ?? currentPeriod();

  const [klass, students] = await Promise.all([
    getClassById(classId),
    listClassStudents(classId, period),
  ]);

  if (!klass) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          {dict.common.students}
          <span className="ml-2 text-sm font-normal text-ink-muted">
            {interpolate(dict.classes.students.activeCount, {
              count: students.filter((s) => s.member_status === "ACTIVE").length,
            })}
          </span>
        </h2>
        <PeriodPicker />
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">👥</span>}
          title={dict.classes.students.noneTitle}
          description={dict.classes.students.noneBody}
        />
      ) : (
        <ClassStudents
          classId={classId}
          students={students}
          canManage={canRecordSessions(user, klass)}
        />
      )}
    </div>
  );
}
