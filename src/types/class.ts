import type { ClassRow, ClassStatus, ClassType, MemberStatus } from "./database";

export type { ClassRow, ClassStatus, ClassType, MemberStatus };

/** The three class shapes, in the order the create form offers them.
 *
 *  Their labels and descriptions live in the dictionary
 *  (`dict.classTypes`, `dict.classStatus`) so they can be translated; this
 *  file keeps only what does not change with language.
 */
export const CLASS_TYPES: ClassType[] = ["ONE_TO_ONE", "ONE_TO_TWO", "GROUP"];

export const CLASS_STATUSES: ClassStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

/** Capacity is implied by type for the fixed shapes; only GROUP is free. */
export function capacityForType(type: ClassType, requested: number): number {
  if (type === "ONE_TO_ONE") return 1;
  if (type === "ONE_TO_TWO") return 2;
  return Math.max(1, requested);
}

/** A class row plus the joined/aggregated fields the list and cards need. */
export interface ClassSummary extends ClassRow {
  teacher_name: string | null;
  student_count: number;
  /** Sessions actually recorded this month, across all students. */
  sessions_recorded: number;
  /** 0-100, how far through the month's lesson allowance the class is. */
  progress: number;
  average_score: number | null;
}

export interface ClassDetail extends ClassRow {
  teacher_name: string | null;
  teacher_email: string | null;
  student_count: number;
}
