import "server-only";

import { createClient } from "@/lib/supabase/server";
import { roundTo } from "@/lib/utils";
import type { ClassRow, MonthlyProgressRow, ProfileRow } from "@/types/database";
import type { ClassReportRow, ReportFilters, ReportTotals } from "@/types/report";

export interface ClassReport {
  rows: ClassReportRow[];
  totals: ReportTotals;
}

const mean = (values: number[]) =>
  values.length > 0 ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;

/**
 * Monthly report across classes.
 *
 * Reads entirely from `monthly_progress`, so the cost is one indexed range
 * scan per month regardless of how many lessons were recorded. RLS keeps a
 * teacher's report to their own classes without a filter here.
 */
export async function getClassReport(filters: ReportFilters): Promise<ClassReport> {
  const supabase = await createClient();

  let classQuery = supabase.from("classes").select("*").neq("status", "ARCHIVED");
  if (filters.teacherId) classQuery = classQuery.eq("teacher_id", filters.teacherId);
  if (filters.classId) classQuery = classQuery.eq("id", filters.classId);

  const { data: classData, error: classError } = await classQuery.order("name");
  if (classError) throw classError;

  const classes = (classData ?? []) as ClassRow[];
  if (classes.length === 0) {
    return {
      rows: [],
      totals: {
        classes: 0,
        students: 0,
        lessons: 0,
        average_score: null,
        attendance_rate: null,
      },
    };
  }

  const classIds = classes.map((c) => c.id);
  const teacherIds = [...new Set(classes.map((c) => c.teacher_id).filter(Boolean))] as string[];

  let progressQuery = supabase
    .from("monthly_progress")
    .select("*")
    .in("class_id", classIds)
    .eq("year", filters.year)
    .eq("month", filters.month);

  if (filters.studentId) progressQuery = progressQuery.eq("student_id", filters.studentId);

  const [progressResult, teacherResult] = await Promise.all([
    progressQuery,
    teacherIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", teacherIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (progressResult.error) throw progressResult.error;

  const teacherNames = new Map<string, string>();
  for (const t of (teacherResult.data ?? []) as Pick<ProfileRow, "id" | "full_name">[]) {
    teacherNames.set(t.id, t.full_name);
  }

  const byClass = new Map<string, MonthlyProgressRow[]>();
  for (const row of (progressResult.data ?? []) as MonthlyProgressRow[]) {
    const bucket = byClass.get(row.class_id) ?? [];
    bucket.push(row);
    byClass.set(row.class_id, bucket);
  }

  const rows: ClassReportRow[] = classes.map((klass) => {
    const progress = byClass.get(klass.id) ?? [];
    const scores = progress
      .map((p) => p.average_score)
      .filter((s): s is number => s !== null)
      .map(Number);
    const rates = progress
      .map((p) => p.attendance_rate)
      .filter((r): r is number => r !== null)
      .map(Number);

    return {
      class_id: klass.id,
      class_name: klass.name,
      class_code: klass.code,
      teacher_name: klass.teacher_id ? (teacherNames.get(klass.teacher_id) ?? null) : null,
      student_count: progress.length,
      lessons_recorded: progress.reduce((sum, p) => sum + p.lessons_completed, 0),
      average_score: mean(scores),
      attendance_rate: mean(rates),
    };
  });

  // Only classes with activity should sway the headline numbers.
  const active = rows.filter((r) => r.student_count > 0);

  const totals: ReportTotals = {
    classes: active.length,
    students: active.reduce((sum, r) => sum + r.student_count, 0),
    lessons: active.reduce((sum, r) => sum + r.lessons_recorded, 0),
    average_score: mean(
      active.map((r) => r.average_score).filter((s): s is number => s !== null),
    ),
    attendance_rate: mean(
      active.map((r) => r.attendance_rate).filter((s): s is number => s !== null),
    ),
  };

  return { rows, totals };
}

/** Student options for the report filter, scoped by RLS to what you may see. */
export async function listStudentOptions(
  classId?: string,
): Promise<Array<Pick<ProfileRow, "id" | "full_name">>> {
  const supabase = await createClient();

  if (classId) {
    const { data: members, error } = await supabase
      .from("class_members")
      .select("student_id")
      .eq("class_id", classId)
      .eq("status", "ACTIVE");
    if (error) throw error;

    const ids = (members ?? []).map((m) => (m as { student_id: string }).student_id);
    if (ids.length === 0) return [];

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids)
      .order("full_name");
    if (profileError) throw profileError;
    return (data ?? []) as Array<Pick<ProfileRow, "id" | "full_name">>;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "STUDENT")
    .eq("status", "ACTIVE")
    .order("full_name")
    .limit(500);

  if (error) throw error;
  return (data ?? []) as Array<Pick<ProfileRow, "id" | "full_name">>;
}
