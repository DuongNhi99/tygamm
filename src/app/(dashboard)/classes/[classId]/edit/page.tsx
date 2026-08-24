import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { canEditClass, isAdmin } from "@/lib/permissions";
import { getClassById } from "@/services/class.service";
import { listTeacherOptions } from "@/services/teacher.service";
import { getAppSettings } from "@/services/settings.service";
import { ClassForm } from "@/components/classes/class-form";
import { getDictionary } from "@/lib/i18n/server";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const user = await requireStaff();

  const klass = await getClassById(classId);
  if (!klass) notFound();

  // A teacher may edit their own class, nobody else's.
  if (!canEditClass(user, klass)) redirect(`/classes/${classId}`);

  const [teachers, settings, dict] = await Promise.all([
    listTeacherOptions(),
    getAppSettings(),
    getDictionary(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-lg font-semibold text-ink">{dict.classes.editTitle}</h2>
      <ClassForm
        klass={klass}
        teachers={teachers}
        defaultSessionsPerMonth={settings.default_sessions_per_month}
        canReassignTeacher={isAdmin(user)}
      />
    </div>
  );
}
