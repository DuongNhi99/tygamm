import type { ProfileRow, UserStatus } from "./database";

export type { UserStatus };

/** A student in a list view, with their cross-class rollups. */
export interface StudentSummary extends ProfileRow {
  class_count: number;
  average_score: number | null;
  attendance_rate: number | null;
}

/** A student inside one specific class (the Students tab). */
export interface ClassStudent {
  member_id: string;
  student_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  member_status: "ACTIVE" | "INACTIVE";
  joined_at: string;
  average_score: number | null;
  attendance_rate: number | null;
  lessons_completed: number;
}

export interface TeacherSummary extends ProfileRow {
  class_count: number;
  student_count: number;
}
