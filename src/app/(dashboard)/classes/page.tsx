import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canCreateClass } from "@/lib/permissions";
import { listClasses } from "@/services/class.service";
import { listTeacherOptions } from "@/services/teacher.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { ClassCard } from "@/components/classes/class-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Pagination } from "@/components/ui/pagination";
import { CLASS_STATUS_LABELS, CLASS_TYPE_LABELS } from "@/types/class";
import type { ClassStatus, ClassType } from "@/types/database";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireAuth();

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const page = Number(single("page") ?? "1") || 1;

  // Teachers only see their own classes anyway (RLS), so the teacher filter
  // is only useful — and only shown — to an admin.
  const isAdmin = user.profile.role === "ADMIN";
  const [result, teachers] = await Promise.all([
    listClasses({
      search: single("q"),
      teacherId: isAdmin ? single("teacher") : undefined,
      status: (single("status") as ClassStatus | undefined) ?? "ALL",
      classType: (single("type") as ClassType | undefined) ?? "ALL",
      page,
    }),
    isAdmin ? listTeacherOptions() : Promise.resolve([]),
  ]);

  const hasFilters = Boolean(
    single("q") || single("teacher") || single("status") || single("type"),
  );

  return (
    <>
      <PageHeader
        title="Classes"
        description="Every class in the centre, with this month's progress."
        actions={
          canCreateClass(user) && (
            <LinkButton href="/classes/create">
              <Plus className="h-4 w-4" />
              Create class
            </LinkButton>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            paramKey="q"
            placeholder="Search name or code..."
            label="Search classes"
            className="sm:col-span-2 lg:col-span-1"
          />

          {isAdmin && (
            <FilterSelect
              paramKey="teacher"
              label="Filter by teacher"
              allLabel="All teachers"
              options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
            />
          )}

          <FilterSelect
            paramKey="status"
            label="Filter by status"
            allLabel="All statuses"
            options={Object.entries(CLASS_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />

          <FilterSelect
            paramKey="type"
            label="Filter by class type"
            allLabel="All types"
            options={Object.entries(CLASS_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
      </PageHeader>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">🎸</span>}
          title={hasFilters ? "No classes match those filters" : "No classes yet"}
          description={
            hasFilters
              ? "Try a different search term, or clear the filters."
              : "Create your first class to start managing your students and lessons."
          }
          action={
            !hasFilters && canCreateClass(user) ? (
              <LinkButton href="/classes/create">Create class</LinkButton>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.rows.map((klass) => (
              <ClassCard key={klass.id} klass={klass} />
            ))}
          </div>

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
