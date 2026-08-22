import type { ClassRow, ClassStatus, ClassType, MemberStatus } from "./database";

export type { ClassRow, ClassStatus, ClassType, MemberStatus };

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  ONE_TO_ONE: "1-1",
  ONE_TO_TWO: "2-1",
  GROUP: "Group",
};

export const CLASS_TYPE_DESCRIPTIONS: Record<ClassType, string> = {
  ONE_TO_ONE: "One teacher, one student",
  ONE_TO_TWO: "One teacher, two students",
  GROUP: "One teacher, many students",
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

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
