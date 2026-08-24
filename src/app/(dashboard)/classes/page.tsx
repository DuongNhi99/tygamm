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
import { CLASS_STATUSES, CLASS_TYPES } from "@/types/class";
import { getDictionary } from "@/lib/i18n/server";
import type { ClassStatus, ClassType } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.classes.meta };
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, user, dict] = await Promise.all([searchParams, requireAuth(), getDictionary()]);

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
        title={dict.classes.title}
        description={dict.classes.subtitle}
        actions={
          canCreateClass(user) && (
            <LinkButton href="/classes/create">
              <Plus className="h-4 w-4" />
              {dict.classes.create}
            </LinkButton>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            paramKey="q"
            placeholder={dict.classes.searchPlaceholder}
            label={dict.classes.searchLabel}
            className="sm:col-span-2 lg:col-span-1"
          />

          {isAdmin && (
            <FilterSelect
              paramKey="teacher"
              label={dict.classes.filterTeacher}
              allLabel={dict.classes.allTeachers}
              options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
            />
          )}

          <FilterSelect
            paramKey="status"
            label={dict.classes.filterStatus}
            allLabel={dict.classes.allStatuses}
            options={CLASS_STATUSES.map((value) => ({
              value,
              label: dict.classStatus[value],
            }))}
          />

          <FilterSelect
            paramKey="type"
            label={dict.classes.filterType}
            allLabel={dict.classes.allTypes}
            options={CLASS_TYPES.map((value) => ({
              value,
              label: dict.classTypes.labels[value],
            }))}
          />
        </div>
      </PageHeader>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true">🎸</span>}
          title={hasFilters ? dict.classes.noMatchTitle : dict.dashboard.noClassesTitle}
          description={
            hasFilters ? dict.classes.noMatchBody : dict.dashboard.noClassesBody
          }
          action={
            !hasFilters && canCreateClass(user) ? (
              <LinkButton href="/classes/create">{dict.classes.create}</LinkButton>
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
