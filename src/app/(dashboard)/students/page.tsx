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
import { getDictionary } from "@/lib/i18n/server";
import type { UserStatus } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.students.meta };
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user, dict] = await Promise.all([searchParams, requireStaff(), getDictionary()]);

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
        title={dict.students.title}
        description={
          isAdmin(user) ? dict.students.subtitleAdmin : dict.students.subtitleTeacher
        }
        actions={
          isAdmin(user) && <CreateUserDialog role="STUDENT" buttonLabel={dict.students.add} />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            paramKey="q"
            placeholder={dict.students.searchPlaceholder}
            label={dict.students.searchLabel}
            className="sm:col-span-2"
          />

          <FilterSelect
            paramKey="class"
            label={dict.students.filterClass}
            allLabel={dict.students.allClasses}
            options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          />

          <FilterSelect
            paramKey="status"
            label={dict.classes.filterStatus}
            allLabel={dict.classes.allStatuses}
            options={[
              { value: "ACTIVE", label: dict.common.active },
              { value: "INACTIVE", label: dict.common.inactive },
            ]}
          />
        </div>
      </PageHeader>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">👥</span>}
          title={hasFilters ? dict.students.noMatchTitle : dict.students.noneTitle}
          description={hasFilters ? dict.students.noMatchBody : dict.students.noneBody}
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
