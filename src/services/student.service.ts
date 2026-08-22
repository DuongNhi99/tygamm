import "server-only";

import { createClient } from "@/lib/supabase/server";
import { currentPeriod, roundTo, type Period } from "@/lib/utils";
import type {
  ClassMemberRow,
  ClassRow,
  MonthlyProgressRow,
  ProfileRow,
  StudentSearchRow,
  UserStatus,
} from "@/types/database";
import type { ClassStudent, StudentSummary } from "@/types/student";
import type { Paginated } from "./class.service";

export interface StudentFilters {
  search?: string;
  status?: UserStatus | "ALL";
  classId?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Student directory.
 *
 * RLS does the scoping: an admin sees everyone, a teacher only sees students
 * on one of their own rosters (see `can_view_profile` in migration 007).
 */
export async function listStudents(
  filters: StudentFilters = {},
  period: Period = currentPeriod(),
): Promise<Paginated<StudentSummary>> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  // Filtering by class needs the roster first — there is no join to filter on.
  let restrictToIds: string[] | null = null;
  if (filters.classId) {
    const { data, error } = await supabase
      .from("class_members")
      .select("student_id")
      .eq("class_id", filters.classId)
      .eq("status", "ACTIVE");
    if (error) throw error;
    restrictToIds = (data ?? []).map((m) => (m as { student_id: string }).student_id);
    if (restrictToIds.length === 0) {
      return { rows: [], total: 0, page, pageSize, pageCount: 1 };
    }
  }

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "STUDENT");

  if (restrictToIds) query = query.in("id", restrictToIds);

  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[,()*]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  if (filters.status && filters.status !== "ALL") query = query.eq("status", filters.status);

  const { data, error, count } = await query
    .order("full_name")
    .range(from, from + pageSize - 1);

  if (error) throw error;

  const students = (data ?? []) as ProfileRow[];
  const rows = await decorateStudents(students, period);
  const total = count ?? 0;

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function decorateStudents(
  students: ProfileRow[],
  period: Period,
): Promise<StudentSummary[]> {
  if (students.length === 0) return [];

  const supabase = await createClient();
  const ids = students.map((s) => s.id);

  const [membershipResult, progressResult] = await Promise.all([
    supabase
      .from("class_members")
      .select("student_id")
      .in("student_id", ids)
      .eq("status", "ACTIVE"),
    supabase
      .from("monthly_progress")
      .select("student_id, average_score, attendance_rate")
      .in("student_id", ids)
      .eq("year", period.year)
      .eq("month", period.month),
  ]);

  const classCounts = new Map<string, number>();
  for (const m of (membershipResult.data ?? []) as { student_id: string }[]) {
    classCounts.set(m.student_id, (classCounts.get(m.student_id) ?? 0) + 1);
  }

  const rollups = new Map<string, { scores: number[]; rates: number[] }>();
  for (const p of (progressResult.data ?? []) as Pick<
    MonthlyProgressRow,
    "student_id" | "average_score" | "attendance_rate"
  >[]) {
    const bucket = rollups.get(p.student_id) ?? { scores: [], rates: [] };
    if (p.average_score !== null) bucket.scores.push(Number(p.average_score));
    if (p.attendance_rate !== null) bucket.rates.push(Number(p.attendance_rate));
    rollups.set(p.student_id, bucket);
  }

  const mean = (values: number[]) =>
    values.length > 0 ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;

  return students.map((student) => {
    const bucket = rollups.get(student.id);
    return {
      ...student,
      class_count: classCounts.get(student.id) ?? 0,
      average_score: mean(bucket?.scores ?? []),
      attendance_rate: mean(bucket?.rates ?? []),
    };
  });
}

export async function getStudent(studentId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .eq("role", "STUDENT")
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

/** The roster of one class, with each student's rollups for the period. */
export async function listClassStudents(
  classId: string,
  period: Period = currentPeriod(),
): Promise<ClassStudent[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("class_members")
    .select("id, class_id, student_id, joined_at, status")
    .eq("class_id", classId)
    .order("joined_at");

  if (error) throw error;

  const rows = (members ?? []) as ClassMemberRow[];
  if (rows.length === 0) return [];

  const studentIds = rows.map((m) => m.student_id);

  const [profilesResult, progressResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url")
      .in("id", studentIds),
    supabase
      .from("monthly_progress")
      .select("student_id, average_score, attendance_rate, lessons_completed")
      .eq("class_id", classId)
      .eq("year", period.year)
      .eq("month", period.month),
  ]);

  const profiles = new Map<string, Pick<ProfileRow, "id" | "full_name" | "email" | "phone" | "avatar_url">>();
  for (const p of (profilesResult.data ?? []) as Array<
    Pick<ProfileRow, "id" | "full_name" | "email" | "phone" | "avatar_url">
  >) {
    profiles.set(p.id, p);
  }

  const progress = new Map<string, Pick<MonthlyProgressRow, "average_score" | "attendance_rate" | "lessons_completed">>();
  for (const p of (progressResult.data ?? []) as Array<
    Pick<MonthlyProgressRow, "student_id" | "average_score" | "attendance_rate" | "lessons_completed">
  >) {
    progress.set(p.student_id, p);
  }

  return rows.map((member) => {
    const profile = profiles.get(member.student_id);
    const rollup = progress.get(member.student_id);
    return {
      member_id: member.id,
      student_id: member.student_id,
      full_name: profile?.full_name ?? "Unknown student",
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      avatar_url: profile?.avatar_url ?? null,
      member_status: member.status,
      joined_at: member.joined_at,
      average_score: rollup?.average_score !== null && rollup?.average_score !== undefined
        ? Number(rollup.average_score)
        : null,
      attendance_rate:
        rollup?.attendance_rate !== null && rollup?.attendance_rate !== undefined
          ? Number(rollup.attendance_rate)
          : null,
      lessons_completed: rollup?.lessons_completed ?? 0,
    };
  });
}

/** Classes a student belongs to, for their profile page. */
export async function listStudentClasses(studentId: string): Promise<ClassRow[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE");

  if (error) throw error;

  const classIds = (members ?? []).map((m) => (m as { class_id: string }).class_id);
  if (classIds.length === 0) return [];

  const { data, error: classError } = await supabase
    .from("classes")
    .select("*")
    .in("id", classIds)
    .order("name");

  if (classError) throw classError;
  return (data ?? []) as ClassRow[];
}

/**
 * "Add student by email or phone". Goes through the definer-rights RPC
 * because a teacher cannot select a student they do not already teach.
 */
export async function findStudentsByContact(query: string): Promise<StudentSearchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_student_by_contact", { p_query: query });
  if (error) throw error;
  return (data ?? []) as StudentSearchRow[];
}

export async function addStudentToClass(classId: string, studentId: string): Promise<void> {
  const supabase = await createClient();

  // Re-activate a previous member rather than tripping the unique constraint.
  const { data: existing, error: lookupError } = await supabase
    .from("class_members")
    .select("id, status")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const member = existing as Pick<ClassMemberRow, "id" | "status">;
    if (member.status === "ACTIVE") throw new Error("ALREADY_A_MEMBER");

    const { error } = await supabase
      .from("class_members")
      .update({ status: "ACTIVE", joined_at: new Date().toISOString() })
      .eq("id", member.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("class_members")
    .insert({ class_id: classId, student_id: studentId });
  if (error) throw error;
}

/**
 * Removing a student deactivates the membership instead of deleting it, so
 * their recorded lessons and scores stay intact.
 */
export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_members")
    .update({ status: "INACTIVE" })
    .eq("class_id", classId)
    .eq("student_id", studentId);
  if (error) throw error;
}
