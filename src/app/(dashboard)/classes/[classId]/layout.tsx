import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Pencil, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { canAddStudentToClass, canArchiveClass, canEditClass } from "@/lib/permissions";
import { getClassById } from "@/services/class.service";
import { Tabs } from "@/components/ui/tabs";
import { ClassStatusBadge, Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CopyCodeButton } from "@/components/classes/copy-code-button";
import { AddStudentDialog } from "@/components/classes/add-student-dialog";
import { ArchiveClassButton } from "@/components/classes/archive-class-button";
import { CLASS_TYPE_LABELS } from "@/types/class";

/**
 * Shared chrome for the class tabs. The class is fetched here and again in
 * each tab page, but `getClassById` is React-cached so that is one query.
 */
export default async function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const user = await requireAuth();

  // RLS returns nothing for a class this user may not see, so "not permitted"
  // and "does not exist" are the same 404 — no existence leak either way.
  const klass = await getClassById(classId);
  if (!klass) notFound();

  const base = `/classes/${classId}`;
  const isFull = klass.student_count >= klass.max_students;

  return (
    <>
      <Link
        href="/classes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All classes
      </Link>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {klass.name}
              </h1>
              <ClassStatusBadge status={klass.status} />
              <Badge tone="brand">{CLASS_TYPE_LABELS[klass.class_type]}</Badge>
            </div>

            <p className="font-mono text-sm tracking-wide text-ink-muted">{klass.code}</p>

            <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                <dt className="sr-only">Teacher</dt>
                <dd>{klass.teacher_name ?? "Unassigned"}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden="true" />
                <dt className="sr-only">Students</dt>
                <dd>
                  {klass.student_count} of {klass.max_students} students
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canAddStudentToClass(user, klass) && (
              <AddStudentDialog classId={classId} isFull={isFull} />
            )}
            <CopyCodeButton code={klass.code} />
            <CopyCodeButton code={klass.code} mode="invite" />
            {canEditClass(user, klass) && (
              <LinkButton href={`${base}/edit`} variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </LinkButton>
            )}
            {canArchiveClass(user) && klass.status !== "ARCHIVED" && (
              <ArchiveClassButton classId={classId} />
            )}
          </div>
        </div>

        <Tabs
          items={[
            { href: base, label: "Overview" },
            { href: `${base}/students`, label: "Students" },
            { href: `${base}/sessions`, label: "Sessions" },
            { href: `${base}/progress`, label: "Progress" },
          ]}
        />
      </div>

      {children}
    </>
  );
}
