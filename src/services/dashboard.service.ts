import "server-only";

import { createClient } from "@/lib/supabase/server";
import { currentPeriod, recentPeriods, roundTo, type Period } from "@/lib/utils";
import { decorateClasses } from "./class.service";
import type { ClassRow, MonthlyProgressRow, ProfileRow } from "@/types/database";
import type { ClassSummary } from "@/types/class";

export interface DashboardStats {
  totalClasses: number;
  activeTeachers: number;
  totalStudents: number;
  lessonsThisMonth: number;
  averageScore: number | null;
}

/**
 * One line of the activity feed.
 *
 * The row carries its parts rather than a finished sentence: word order
 * differs between the three locales, so the sentence is assembled from the
 * dictionary at render time instead of being baked in here.
 */
export interface ActivityItem {
  id: string;
  kind: "score" | "join" | "class";
  /** Student name, or null when the profile is no longer visible. */
  student: string | null;
  /** Class name, or null when the class is no longer visible. */
  className: string | null;
  /** Only set for `kind: "class"`. */
  classCode?: string;
  at: string;
}

export interface MonthlyPoint {
  /** 1-based, so the chart can label the axis in the reader's language. */
  month: number;
  year: number;
  average: number | null;
  lessons: number;
}

export interface ClassPerformancePoint {
  name: string;
  average: number;
}

export interface AdminDashboard {
  stats: DashboardStats;
  classes: ClassSummary[];
  activity: ActivityItem[];
  monthly: MonthlyPoint[];
  classPerformance: ClassPerformancePoint[];
  attendance: { present: number; absent: number; makeup: number };
}

const mean = (values: number[]) =>
  values.length > 0 ? roundTo(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;

/** Trend line for the last `monthsBack` months, oldest first. */
async function monthlySeries(monthsBack = 6): Promise<MonthlyPoint[]> {
  const supabase = await createClient();
  const periods = recentPeriods(monthsBack).reverse();
  const oldest = periods[0];

  const { data, error } = await supabase
    .from("monthly_progress")
    .select("year, month, average_score, lessons_completed")
    .gte("year", oldest.year);

  if (error) throw error;

  const buckets = new Map<string, { scores: number[]; lessons: number }>();
  for (const row of (data ?? []) as Array<
    Pick<MonthlyProgressRow, "year" | "month" | "average_score" | "lessons_completed">
  >) {
    const key = `${row.year}-${row.month}`;
    const bucket = buckets.get(key) ?? { scores: [], lessons: 0 };
    if (row.average_score !== null) bucket.scores.push(Number(row.average_score));
    bucket.lessons += row.lessons_completed;
    buckets.set(key, bucket);
  }

  return periods.map((period) => {
    const bucket = buckets.get(`${period.year}-${period.month}`);
    return {
      month: period.month,
      year: period.year,
      average: mean(bucket?.scores ?? []),
      lessons: bucket?.lessons ?? 0,
    };
  });
}

async function attendanceBreakdown(period: Period) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_sessions")
    .select("attendance")
    .eq("period_year", period.year)
    .eq("period_month", period.month)
    .not("attendance", "is", null);

  if (error) throw error;

  const counts = { present: 0, absent: 0, makeup: 0 };
  for (const row of (data ?? []) as Array<{ attendance: string | null }>) {
    if (row.attendance === "PRESENT") counts.present++;
    else if (row.attendance === "ABSENT") counts.absent++;
    else if (row.attendance === "MAKEUP") counts.makeup++;
  }
  return counts;
}

/**
 * Recent activity feed.
 *
 * Three small ordered reads merged in memory rather than a UNION view — the
 * three sources have different shapes and each is a `limit 5` on an indexed
 * column, so this stays cheap and stays readable.
 */
async function recentActivity(): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const [sessions, members, classes] = await Promise.all([
    supabase
      .from("lesson_sessions")
      .select("id, student_id, class_id, updated_at, score")
      .not("score", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("class_members")
      .select("id, student_id, class_id, joined_at")
      .order("joined_at", { ascending: false })
      .limit(5),
    supabase
      .from("classes")
      .select("id, name, code, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const sessionRows = (sessions.data ?? []) as Array<{
    id: string;
    student_id: string;
    class_id: string;
    updated_at: string;
  }>;
  const memberRows = (members.data ?? []) as Array<{
    id: string;
    student_id: string;
    class_id: string;
    joined_at: string;
  }>;
  const classRows = (classes.data ?? []) as Array<{
    id: string;
    name: string;
    code: string;
    created_at: string;
  }>;

  const studentIds = [
    ...new Set([...sessionRows.map((s) => s.student_id), ...memberRows.map((m) => m.student_id)]),
  ];
  const classIds = [
    ...new Set([...sessionRows.map((s) => s.class_id), ...memberRows.map((m) => m.class_id)]),
  ];

  const [profileResult, classResult] = await Promise.all([
    studentIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    classIds.length
      ? supabase.from("classes").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const names = new Map<string, string>();
  for (const p of (profileResult.data ?? []) as Pick<ProfileRow, "id" | "full_name">[]) {
    names.set(p.id, p.full_name);
  }
  const classNames = new Map<string, string>();
  for (const c of (classResult.data ?? []) as Array<{ id: string; name: string }>) {
    classNames.set(c.id, c.name);
  }

  const items: ActivityItem[] = [
    ...sessionRows.map((s) => ({
      id: `score-${s.id}`,
      kind: "score" as const,
      student: names.get(s.student_id) ?? null,
      className: classNames.get(s.class_id) ?? null,
      at: s.updated_at,
    })),
    ...memberRows.map((m) => ({
      id: `join-${m.id}`,
      kind: "join" as const,
      student: names.get(m.student_id) ?? null,
      className: classNames.get(m.class_id) ?? null,
      at: m.joined_at,
    })),
    ...classRows.map((c) => ({
      id: `class-${c.id}`,
      kind: "class" as const,
      student: null,
      className: c.name,
      classCode: c.code,
      at: c.created_at,
    })),
  ];

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

export async function getAdminDashboard(
  period: Period = currentPeriod(),
): Promise<AdminDashboard> {
  const supabase = await createClient();

  const [
    classCount,
    teacherCount,
    studentCount,
    lessonCount,
    progressResult,
    recentClasses,
    monthly,
    activity,
    attendance,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .neq("status", "ARCHIVED"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "TEACHER")
      .eq("status", "ACTIVE"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "STUDENT")
      .eq("status", "ACTIVE"),
    supabase
      .from("lesson_sessions")
      .select("id", { count: "exact", head: true })
      .eq("period_year", period.year)
      .eq("period_month", period.month)
      .not("attendance", "is", null),
    supabase
      .from("monthly_progress")
      .select("class_id, average_score")
      .eq("year", period.year)
      .eq("month", period.month),
    supabase
      .from("classes")
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(6),
    monthlySeries(),
    recentActivity(),
    attendanceBreakdown(period),
  ]);

  const progressRows = (progressResult.data ?? []) as Array<
    Pick<MonthlyProgressRow, "class_id" | "average_score">
  >;

  const classes = await decorateClasses((recentClasses.data ?? []) as ClassRow[], period);

  const perClass = new Map<string, number[]>();
  for (const row of progressRows) {
    if (row.average_score === null) continue;
    const bucket = perClass.get(row.class_id) ?? [];
    bucket.push(Number(row.average_score));
    perClass.set(row.class_id, bucket);
  }

  // The bar chart ranks every class with activity this month, which is a
  // wider set than the six recent classes listed above.
  const performanceIds = [...perClass.keys()];
  const { data: performanceNames } = performanceIds.length
    ? await supabase.from("classes").select("id, name").in("id", performanceIds)
    : { data: [] };

  const classNames = new Map(
    ((performanceNames ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
  );

  const classPerformance: ClassPerformancePoint[] = [...perClass.entries()]
    .filter(([classId]) => classNames.has(classId))
    .map(([classId, scores]) => ({
      name: classNames.get(classId) as string,
      average: mean(scores) ?? 0,
    }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 6);

  return {
    stats: {
      totalClasses: classCount.count ?? 0,
      activeTeachers: teacherCount.count ?? 0,
      totalStudents: studentCount.count ?? 0,
      lessonsThisMonth: lessonCount.count ?? 0,
      averageScore: mean(
        progressRows
          .map((r) => r.average_score)
          .filter((s): s is number => s !== null)
          .map(Number),
      ),
    },
    classes,
    activity,
    monthly,
    classPerformance,
    attendance,
  };
}

export interface StudentDashboard {
  stats: {
    classCount: number;
    lessonsCompleted: number;
    averageScore: number | null;
    attendanceRate: number | null;
  };
  classes: ClassSummary[];
}

/**
 * Minimal student view (§6 keeps the student app out of the MVP), but enough
 * that a student who joins with an invite link lands somewhere meaningful.
 */
export async function getStudentDashboard(
  studentId: string,
  period: Period = currentPeriod(),
): Promise<StudentDashboard> {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE");

  if (error) throw error;

  const classIds = (memberships ?? []).map((m) => (m as { class_id: string }).class_id);

  if (classIds.length === 0) {
    return {
      stats: { classCount: 0, lessonsCompleted: 0, averageScore: null, attendanceRate: null },
      classes: [],
    };
  }

  const [classResult, progressResult] = await Promise.all([
    supabase.from("classes").select("*").in("id", classIds).order("name"),
    supabase
      .from("monthly_progress")
      .select("average_score, attendance_rate, lessons_completed")
      .eq("student_id", studentId)
      .eq("year", period.year)
      .eq("month", period.month),
  ]);

  if (classResult.error) throw classResult.error;

  const progress = (progressResult.data ?? []) as Array<
    Pick<MonthlyProgressRow, "average_score" | "attendance_rate" | "lessons_completed">
  >;

  return {
    stats: {
      classCount: classIds.length,
      lessonsCompleted: progress.reduce((sum, p) => sum + p.lessons_completed, 0),
      averageScore: mean(
        progress.map((p) => p.average_score).filter((s): s is number => s !== null).map(Number),
      ),
      attendanceRate: mean(
        progress.map((p) => p.attendance_rate).filter((s): s is number => s !== null).map(Number),
      ),
    },
    classes: await decorateClasses((classResult.data ?? []) as ClassRow[], period),
  };
}

export interface TeacherDashboard {
  stats: {
    classCount: number;
    studentCount: number;
    lessonsThisMonth: number;
    averageScore: number | null;
  };
  classes: ClassSummary[];
  monthly: MonthlyPoint[];
  attendance: { present: number; absent: number; makeup: number };
}

/**
 * The teacher view. Every query below is already restricted to this
 * teacher's classes by RLS, so no `teacher_id` filter is needed beyond the
 * initial class lookup — and no path exists to another teacher's data.
 */
export async function getTeacherDashboard(
  teacherId: string,
  period: Period = currentPeriod(),
): Promise<TeacherDashboard> {
  const supabase = await createClient();

  const { data: classData, error } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .neq("status", "ARCHIVED")
    .order("name");

  if (error) throw error;

  const classes = (classData ?? []) as ClassRow[];
  const classIds = classes.map((c) => c.id);

  if (classIds.length === 0) {
    return {
      stats: { classCount: 0, studentCount: 0, lessonsThisMonth: 0, averageScore: null },
      classes: [],
      monthly: await monthlySeries(),
      attendance: { present: 0, absent: 0, makeup: 0 },
    };
  }

  const [membersResult, lessonCount, progressResult, summaries, monthly, attendance] =
    await Promise.all([
      supabase
        .from("class_members")
        .select("student_id")
        .in("class_id", classIds)
        .eq("status", "ACTIVE"),
      supabase
        .from("lesson_sessions")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds)
        .eq("period_year", period.year)
        .eq("period_month", period.month)
        .not("attendance", "is", null),
      supabase
        .from("monthly_progress")
        .select("average_score")
        .in("class_id", classIds)
        .eq("year", period.year)
        .eq("month", period.month),
      decorateClasses(classes, period),
      monthlySeries(),
      attendanceBreakdown(period),
    ]);

  const uniqueStudents = new Set(
    ((membersResult.data ?? []) as Array<{ student_id: string }>).map((m) => m.student_id),
  );

  const scores = ((progressResult.data ?? []) as Array<{ average_score: number | null }>)
    .map((r) => r.average_score)
    .filter((s): s is number => s !== null)
    .map(Number);

  return {
    stats: {
      classCount: classes.length,
      studentCount: uniqueStudents.size,
      lessonsThisMonth: lessonCount.count ?? 0,
      averageScore: mean(scores),
    },
    classes: summaries,
    monthly,
    attendance,
  };
}
