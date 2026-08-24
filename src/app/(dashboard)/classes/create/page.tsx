import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listTeacherOptions } from "@/services/teacher.service";
import { getAppSettings } from "@/services/settings.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { ClassForm } from "@/components/classes/class-form";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.classes.createMeta };
}

export default async function CreateClassPage() {
  // Admin-only, and the RLS insert policy on `classes` says the same.
  await requireAdmin();

  const [teachers, settings, dict] = await Promise.all([
    listTeacherOptions(),
    getAppSettings(),
    getDictionary(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={dict.classes.createTitle}
        description={dict.classes.createSubtitle}
      />

      <ClassForm
        teachers={teachers}
        defaultSessionsPerMonth={settings.default_sessions_per_month}
        canReassignTeacher
      />
    </div>
  );
}
