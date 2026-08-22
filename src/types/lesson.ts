import type { Attendance, LessonSessionRow } from "./database";

export type { Attendance, LessonSessionRow };

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  MAKEUP: "Makeup",
};

/** Badge colours from §24: present green, absent red, makeup amber. */
export const ATTENDANCE_TONES: Record<Attendance, "success" | "danger" | "warning"> = {
  PRESENT: "success",
  ABSENT: "danger",
  MAKEUP: "warning",
};

/** One student's row in the score grid for a given month. */
export interface ScoreGridRow {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  /** Indexed by session number (1-based); missing entries are ungraded. */
  sessions: Record<number, LessonSessionRow>;
  average_score: number | null;
  attendance_rate: number | null;
  lessons_completed: number;
}

export interface ScoreGrid {
  class_id: string;
  year: number;
  month: number;
  sessions_per_month: number;
  rows: ScoreGridRow[];
}
