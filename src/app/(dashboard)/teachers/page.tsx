import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listTeachers } from "@/services/teacher.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { TeachersTable } from "@/components/teachers/teachers-table";
import { CreateUserDialog } from "@/components/students/create-user-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.teachers.meta };
}

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Admin-only page (§29, §63). A teacher who navigates here is redirected.
  await requireAdmin();
  const [params, dict] = await Promise.all([searchParams, getDictionary()]);

  const teachers = await listTeachers(params.q);

  return (
    <>
      <PageHeader
        title={dict.teachers.title}
        description={dict.teachers.subtitle}
        actions={<CreateUserDialog role="TEACHER" buttonLabel={dict.teachers.add} />}
      >
        <SearchInput
          paramKey="q"
          placeholder={dict.teachers.searchPlaceholder}
          label={dict.teachers.searchLabel}
          className="sm:max-w-sm"
        />
      </PageHeader>

      {teachers.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">🎓</span>}
          title={params.q ? dict.teachers.noMatchTitle : dict.teachers.noneTitle}
          description={params.q ? dict.teachers.noMatchBody : dict.teachers.noneBody}
        />
      ) : (
        <TeachersTable teachers={teachers} />
      )}
    </>
  );
}
