import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { listStudents } from "@/services/student.service";
import { listClassOptions } from "@/services/class.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { StudentsTable } from "@/components/students/students-table";
import { CreateUserDialog } from "@/components/students/create-user-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type { UserStatus } from "@/types/database";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user] = await Promise.all([searchParams, requireStaff()]);

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const [result, classes] = await Promise.all([
    listStudents({
      search: single("q"),
      status: (single("status") as UserStatus | undefined) ?? "ALL",
      classId: single("class"),
      page: Number(single("page") ?? "1") || 1,
    }),
    listClassOptions(),
  ]);

  const hasFilters = Boolean(single("q") || single("status") || single("class"));

  return (
    <>
      <PageHeader
        title="Students"
        description={
          isAdmin(user)
            ? "Everyone enrolled at the centre."
            : "Students in the classes you teach."
        }
        actions={isAdmin(user) && <CreateUserDialog role="STUDENT" buttonLabel="Add student" />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            paramKey="q"
            placeholder="Search name, email or phone..."
            label="Search students"
            className="sm:col-span-2"
          />

          <FilterSelect
            paramKey="class"
            label="Filter by class"
            allLabel="All classes"
            options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          />

          <FilterSelect
            paramKey="status"
            label="Filter by status"
            allLabel="All statuses"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
        </div>
      </PageHeader>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">👥</span>}
          title={hasFilters ? "No students match those filters" : "No students yet"}
          description={
            hasFilters
              ? "Try a different search term, or clear the filters."
              : "Add students from a class page, or create their accounts here."
          }
        />
      ) : (
        <>
          <StudentsTable students={result.rows} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            className="mt-6"
          />
        </>
      )}
    </>
  );
}
