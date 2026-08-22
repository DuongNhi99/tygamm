import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canRecordSessions } from "@/lib/permissions";
import { getClassById } from "@/services/class.service";
import { listClassStudents } from "@/services/student.service";
import { currentPeriod, parsePeriodParam } from "@/lib/utils";
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
  const [{ classId }, query, user] = await Promise.all([params, searchParams, requireAuth()]);
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
          Students
          <span className="ml-2 text-sm font-normal text-ink-muted">
            {students.filter((s) => s.member_status === "ACTIVE").length} active
          </span>
        </h2>
        <PeriodPicker />
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">👥</span>}
          title="No students yet"
          description="Add a student by email or phone number to start recording lessons."
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
