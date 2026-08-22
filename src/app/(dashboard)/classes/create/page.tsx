import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listTeacherOptions } from "@/services/teacher.service";
import { getAppSettings } from "@/services/settings.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { ClassForm } from "@/components/classes/class-form";

export const metadata: Metadata = { title: "Create class" };

export default async function CreateClassPage() {
  // Admin-only, and the RLS insert policy on `classes` says the same.
  await requireAdmin();

  const [teachers, settings] = await Promise.all([listTeacherOptions(), getAppSettings()]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Create new class"
        description="Set up a class, assign a teacher, and share the code with students."
      />

      <ClassForm
        teachers={teachers}
        defaultSessionsPerMonth={settings.default_sessions_per_month}
        canReassignTeacher
      />
    </div>
  );
}
