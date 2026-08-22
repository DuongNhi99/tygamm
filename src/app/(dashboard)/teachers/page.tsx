import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listTeachers } from "@/services/teacher.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { TeachersTable } from "@/components/teachers/teachers-table";
import { CreateUserDialog } from "@/components/students/create-user-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Admin-only page (§29, §63). A teacher who navigates here is redirected.
  await requireAdmin();
  const params = await searchParams;

  const teachers = await listTeachers(params.q);

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Manage the teachers at your centre."
        actions={<CreateUserDialog role="TEACHER" buttonLabel="Add teacher" />}
      >
        <SearchInput
          paramKey="q"
          placeholder="Search name, email or phone..."
          label="Search teachers"
          className="sm:max-w-sm"
        />
      </PageHeader>

      {teachers.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">🎓</span>}
          title={params.q ? "No teachers match that search" : "No teachers yet"}
          description={
            params.q
              ? "Try a different name, email or phone number."
              : "Add your first teacher so you can assign them a class."
          }
        />
      ) : (
        <TeachersTable teachers={teachers} />
      )}
    </>
  );
}
