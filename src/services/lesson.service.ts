import "server-only";

import { createClient } from "@/lib/supabase/server";
import { currentPeriod, shiftPeriod, type Period } from "@/lib/utils";
import type {
  ClassRow,
  LessonSessionRow,
  MonthlyProgressRow,
  ProfileRow,
} from "@/types/database";
import type { ScoreGrid, ScoreGridRow } from "@/types/lesson";
import type { BulkSessionInput, SessionEntryInput } from "@/lib/validations";

const CONFLICT_TARGET = "class_id,student_id,period_year,period_month,session_number";

/**
 * The month's score grid for a class: one row per active student, each
 * carrying that student's sessions keyed by session number.
 *
 * Averages come from `monthly_progress` (trigger-maintained) rather than
 * being recomputed here, so the grid, the dashboard and the reports can
 * never disagree about a student's average.
 */
export async function getScoreGrid(
  classId: string,
  period: Period = currentPeriod(),
): Promise<ScoreGrid | null> {
  const supabase = await createClient();

  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("id, sessions_per_month")
    .eq("id", classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!classData) return null;

  const klass = classData as Pick<ClassRow, "id" | "sessions_per_month">;

  const { data: members, error: memberError } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId)
    .eq("status", "ACTIVE");

  if (memberError) throw memberError;

  const studentIds = (members ?? []).map((m) => (m as { student_id: string }).student_id);

  if (studentIds.length === 0) {
    return {
      class_id: classId,
      year: period.year,
      month: period.month,
      sessions_per_month: klass.sessions_per_month,
      rows: [],
    };
  }

  const [profilesResult, sessionsResult, progressResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", studentIds),
    supabase
      .from("lesson_sessions")
      .select("*")
      .eq("class_id", classId)
      .eq("period_year", period.year)
      .eq("period_month", period.month),
    supabase
      .from("monthly_progress")
      .select("student_id, average_score, attendance_rate, lessons_completed")
      .eq("class_id", classId)
      .eq("year", period.year)
      .eq("month", period.month),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (progressResult.error) throw progressResult.error;

  const profiles = new Map<string, Pick<ProfileRow, "id" | "full_name" | "avatar_url">>();
  for (const p of (profilesResult.data ?? []) as Array<
    Pick<ProfileRow, "id" | "full_name" | "avatar_url">
  >) {
    profiles.set(p.id, p);
  }

  const sessionsByStudent = new Map<string, Record<number, LessonSessionRow>>();
  for (const s of (sessionsResult.data ?? []) as LessonSessionRow[]) {
    const bucket = sessionsByStudent.get(s.student_id) ?? {};
    bucket[s.session_number] = { ...s, score: s.score === null ? null : Number(s.score) };
    sessionsByStudent.set(s.student_id, bucket);
  }

  const progress = new Map<
    string,
    Pick<MonthlyProgressRow, "average_score" | "attendance_rate" | "lessons_completed">
  >();
  for (const p of (progressResult.data ?? []) as Array<
    Pick<MonthlyProgressRow, "student_id" | "average_score" | "attendance_rate" | "lessons_completed">
  >) {
    progress.set(p.student_id, p);
  }

  const rows: ScoreGridRow[] = studentIds
    .map((studentId) => {
      const profile = profiles.get(studentId);
      const rollup = progress.get(studentId);
      return {
        student_id: studentId,
        full_name: profile?.full_name ?? "Unknown student",
        avatar_url: profile?.avatar_url ?? null,
        sessions: sessionsByStudent.get(studentId) ?? {},
        average_score:
          rollup?.average_score !== null && rollup?.average_score !== undefined
            ? Number(rollup.average_score)
            : null,
        attendance_rate:
          rollup?.attendance_rate !== null && rollup?.attendance_rate !== undefined
            ? Number(rollup.attendance_rate)
            : null,
        lessons_completed: rollup?.lessons_completed ?? 0,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return {
    class_id: classId,
    year: period.year,
    month: period.month,
    sessions_per_month: klass.sessions_per_month,
    rows,
  };
}

function isEmptyEntry(entry: {
  score: number | null;
  attendance: string | null;
  teacher_note?: string | null;
  homework?: string | null;
  lesson_date?: string | null;
}): boolean {
  return (
    entry.score === null &&
    entry.attendance === null &&
    !entry.teacher_note &&
    !entry.homework &&
    !entry.lesson_date
  );
}

/**
 * Writes one cell of the grid.
 *
 * Clearing every field deletes the row rather than storing an empty one, so
 * "not graded yet" and "graded as nothing" cannot drift apart — and the
 * monthly rollup trigger sees a clean slate either way.
 */
export async function upsertSession(input: SessionEntryInput): Promise<LessonSessionRow | null> {
  const supabase = await createClient();

  if (isEmptyEntry(input)) {
    const { error } = await supabase
      .from("lesson_sessions")
      .delete()
      .eq("class_id", input.class_id)
      .eq("student_id", input.student_id)
      .eq("period_year", input.period_year)
      .eq("period_month", input.period_month)
      .eq("session_number", input.session_number);

    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase
    .from("lesson_sessions")
    .upsert(
      {
        class_id: input.class_id,
        student_id: input.student_id,
        period_year: input.period_year,
        period_month: input.period_month,
        session_number: input.session_number,
        lesson_date: input.lesson_date,
        score: input.score,
        attendance: input.attendance,
        teacher_note: input.teacher_note,
        homework: input.homework,
      },
      { onConflict: CONFLICT_TARGET },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as LessonSessionRow;
}

/**
 * Mobile score entry: a whole month for one student in one round trip.
 *
 * This screen only edits score and attendance, so `teacher_note`,
 * `homework` and `lesson_date` are never named in the payload — naming them
 * would set them to null on conflict and silently erase notes a teacher
 * wrote on the desktop grid.
 *
 * Clearing a cell therefore has two outcomes: delete the row if it holds
 * nothing else, or null out just the score and attendance if it still
 * carries a note or homework.
 */
export async function bulkUpsertSessions(input: BulkSessionInput): Promise<void> {
  const supabase = await createClient();

  const toWrite = input.entries.filter((entry) => !isEmptyEntry(entry));
  const toClear = input.entries.filter((entry) => isEmptyEntry(entry));

  if (toWrite.length > 0) {
    const { error } = await supabase.from("lesson_sessions").upsert(
      toWrite.map((entry) => ({
        class_id: input.class_id,
        student_id: input.student_id,
        period_year: input.period_year,
        period_month: input.period_month,
        session_number: entry.session_number,
        score: entry.score,
        attendance: entry.attendance,
      })),
      { onConflict: CONFLICT_TARGET, ignoreDuplicates: false },
    );
    if (error) throw error;
  }

  if (toClear.length > 0) {
    const sessionNumbers = toClear.map((entry) => entry.session_number);

    // Rows carrying nothing but a score/attendance: remove them entirely.
    const { error: deleteError } = await supabase
      .from("lesson_sessions")
      .delete()
      .eq("class_id", input.class_id)
      .eq("student_id", input.student_id)
      .eq("period_year", input.period_year)
      .eq("period_month", input.period_month)
      .in("session_number", sessionNumbers)
      .is("teacher_note", null)
      .is("homework", null);
    if (deleteError) throw deleteError;

    // Rows that still carry a note or homework: keep the row, clear the marks.
    const { error: updateError } = await supabase
      .from("lesson_sessions")
      .update({ score: null, attendance: null })
      .eq("class_id", input.class_id)
      .eq("student_id", input.student_id)
      .eq("period_year", input.period_year)
      .eq("period_month", input.period_month)
      .in("session_number", sessionNumbers)
      .or("teacher_note.not.is.null,homework.not.is.null");
    if (updateError) throw updateError;
  }
}

/** One student's sessions in one class for one month, ordered by session. */
export async function listStudentSessions(
  classId: string,
  studentId: string,
  period: Period = currentPeriod(),
): Promise<LessonSessionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_sessions")
    .select("*")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .eq("period_year", period.year)
    .eq("period_month", period.month)
    .order("session_number");

  if (error) throw error;
  return ((data ?? []) as LessonSessionRow[]).map((s) => ({
    ...s,
    score: s.score === null ? null : Number(s.score),
  }));
}

/** Notes and homework history across every class, newest first (§25, §26). */
export async function listStudentNotes(
  studentId: string,
  limit = 10,
): Promise<LessonSessionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_sessions")
    .select("*")
    .eq("student_id", studentId)
    .or("teacher_note.not.is.null,homework.not.is.null")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("session_number", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LessonSessionRow[];
}

/** Month-over-month rollups for the progress charts. */
export async function listStudentProgress(
  studentId: string,
  monthsBack = 6,
  classId?: string,
): Promise<MonthlyProgressRow[]> {
  const supabase = await createClient();
  const oldest = shiftPeriod(currentPeriod(), -(monthsBack - 1));

  let query = supabase
    .from("monthly_progress")
    .select("*")
    .eq("student_id", studentId)
    // Cheap prefilter; the exact month boundary is applied below.
    .gte("year", oldest.year);

  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as MonthlyProgressRow[]).filter(
    (row) => row.year * 12 + row.month >= oldest.year * 12 + oldest.month,
  );
}
