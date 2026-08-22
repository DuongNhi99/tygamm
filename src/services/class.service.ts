import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { generateClassCode, nextCodeVariant, normalizeClassCode } from "@/lib/utils/class-code";
import { currentPeriod, roundTo, type Period } from "@/lib/utils";
import type {
  ClassByCodeRow,
  ClassRow,
  ClassStatus,
  ClassType,
  MonthlyProgressRow,
  ProfileRow,
} from "@/types/database";
import type { ClassDetail, ClassSummary } from "@/types/class";
import type { ClassInput } from "@/lib/validations";

export interface ClassFilters {
  search?: string;
  teacherId?: string;
  status?: ClassStatus | "ALL";
  classType?: ClassType | "ALL";
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const DEFAULT_PAGE_SIZE = 12;

/**
 * Classes for the list page, already joined to teacher name, roster size and
 * this month's progress.
 *
 * Deliberately a handful of indexed queries rather than one nested PostgREST
 * embed: the aggregates come from `monthly_progress`, which is maintained by
 * trigger, so no session rows are scanned here at all.
 *
 * RLS narrows the first query for us — an admin sees every class, a teacher
 * only their own — so there is no `teacher_id` filter in application code.
 */
export async function listClasses(
  filters: ClassFilters = {},
  period: Period = currentPeriod(),
): Promise<Paginated<ClassSummary>> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase.from("classes").select("*", { count: "exact" });

  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[,()*]/g, " ");
    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
  }
  if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
  if (filters.status && filters.status !== "ALL") query = query.eq("status", filters.status);
  if (filters.classType && filters.classType !== "ALL") {
    query = query.eq("class_type", filters.classType);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;

  const classes = (data ?? []) as ClassRow[];
  const summaries = await decorateClasses(classes, period);

  const total = count ?? 0;
  return {
    rows: summaries,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Attaches teacher name, roster size and monthly rollups to raw class rows. */
export async function decorateClasses(
  classes: ClassRow[],
  period: Period = currentPeriod(),
): Promise<ClassSummary[]> {
  if (classes.length === 0) return [];

  const supabase = await createClient();
  const classIds = classes.map((c) => c.id);
  const teacherIds = [...new Set(classes.map((c) => c.teacher_id).filter(Boolean))] as string[];

  const [teachersResult, membersResult, progressResult] = await Promise.all([
    teacherIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", teacherIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("class_members")
      .select("class_id, student_id")
      .in("class_id", classIds)
      .eq("status", "ACTIVE"),
    supabase
      .from("monthly_progress")
      .select("class_id, average_score, lessons_completed")
      .in("class_id", classIds)
      .eq("year", period.year)
      .eq("month", period.month),
  ]);

  const teacherNames = new Map<string, string>();
  for (const t of (teachersResult.data ?? []) as Pick<ProfileRow, "id" | "full_name">[]) {
    teacherNames.set(t.id, t.full_name);
  }

  const memberCounts = new Map<string, number>();
  for (const m of (membersResult.data ?? []) as { class_id: string }[]) {
    memberCounts.set(m.class_id, (memberCounts.get(m.class_id) ?? 0) + 1);
  }

  const progressByClass = new Map<string, { scores: number[]; lessons: number[] }>();
  for (const p of (progressResult.data ?? []) as Pick<
    MonthlyProgressRow,
    "class_id" | "average_score" | "lessons_completed"
  >[]) {
    const bucket = progressByClass.get(p.class_id) ?? { scores: [], lessons: [] };
    if (p.average_score !== null) bucket.scores.push(Number(p.average_score));
    bucket.lessons.push(p.lessons_completed);
    progressByClass.set(p.class_id, bucket);
  }

  return classes.map((klass) => {
    const bucket = progressByClass.get(klass.id);
    const scores = bucket?.scores ?? [];
    const lessons = bucket?.lessons ?? [];

    const averageScore =
      scores.length > 0 ? roundTo(scores.reduce((a, b) => a + b, 0) / scores.length, 2) : null;

    // Class progress = how far the average student is through the month's
    // lesson allowance, so a half-taught class reads 50% regardless of size.
    const meanLessons =
      lessons.length > 0 ? lessons.reduce((a, b) => a + b, 0) / lessons.length : 0;
    const progress =
      klass.sessions_per_month > 0
        ? Math.min(100, Math.round((meanLessons / klass.sessions_per_month) * 100))
        : 0;

    return {
      ...klass,
      teacher_name: klass.teacher_id ? (teacherNames.get(klass.teacher_id) ?? null) : null,
      student_count: memberCounts.get(klass.id) ?? 0,
      sessions_recorded: lessons.reduce((a, b) => a + b, 0),
      progress,
      average_score: averageScore,
    };
  });
}

/**
 * Cached per render pass: the class detail layout and its tab page both need
 * the class, and `cache` collapses that into one round trip.
 */
export const getClassById = cache(async (classId: string): Promise<ClassDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const klass = data as ClassRow;

  const [teacherResult, countResult] = await Promise.all([
    klass.teacher_id
      ? supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", klass.teacher_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("class_members")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "ACTIVE"),
  ]);

  const teacher = teacherResult.data as Pick<ProfileRow, "full_name" | "email"> | null;

  return {
    ...klass,
    teacher_name: teacher?.full_name ?? null,
    teacher_email: teacher?.email ?? null,
    student_count: countResult.count ?? 0,
  };
});

/** Public invite lookup — goes through the definer-rights RPC, not the table. */
export async function getClassByCode(code: string): Promise<ClassByCodeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_class_by_code", {
    p_code: normalizeClassCode(code),
  });

  if (error) throw error;
  const rows = (data ?? []) as ClassByCodeRow[];
  return rows[0] ?? null;
}

/**
 * Finds a free class code. The unique index is still the authority — this
 * only avoids handing the user a code we already know is taken.
 */
export async function suggestClassCode(name: string, startDate?: string | null): Promise<string> {
  const supabase = await createClient();
  const base = generateClassCode(name, startDate);

  for (let attempt = 1; attempt <= 6; attempt++) {
    const candidate = nextCodeVariant(base, attempt);
    const { data, error } = await supabase
      .from("classes")
      .select("id")
      .ilike("code", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `${base}${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export async function isClassCodeTaken(code: string, excludeClassId?: string): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase.from("classes").select("id").ilike("code", normalizeClassCode(code));
  if (excludeClassId) query = query.neq("id", excludeClassId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function createClass(input: ClassInput): Promise<ClassRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("classes")
    .insert({
      name: input.name,
      code: normalizeClassCode(input.code),
      class_type: input.class_type,
      max_students: input.max_students,
      teacher_id: input.teacher_id,
      sessions_per_month: input.sessions_per_month,
      start_date: input.start_date,
      status: input.status,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ClassRow;
}

export async function updateClass(classId: string, input: ClassInput): Promise<ClassRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("classes")
    .update({
      name: input.name,
      code: normalizeClassCode(input.code),
      class_type: input.class_type,
      max_students: input.max_students,
      teacher_id: input.teacher_id,
      sessions_per_month: input.sessions_per_month,
      start_date: input.start_date,
      status: input.status,
    })
    .eq("id", classId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ClassRow;
}

/** Archive rather than delete — lesson history has to survive (§29, §50). */
export async function archiveClass(classId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ status: "ARCHIVED" })
    .eq("id", classId);
  if (error) throw error;
}

export async function setClassCode(classId: string, code: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ code: normalizeClassCode(code) })
    .eq("id", classId);
  if (error) throw error;
}

/** Lightweight list for filter dropdowns. */
export async function listClassOptions(): Promise<Array<Pick<ClassRow, "id" | "name" | "code">>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, code")
    .neq("status", "ARCHIVED")
    .order("name");

  if (error) throw error;
  return (data ?? []) as Array<Pick<ClassRow, "id" | "name" | "code">>;
}
