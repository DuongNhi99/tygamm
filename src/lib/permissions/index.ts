import type { ClassRow } from "@/types/database";
import type { SessionUser } from "@/types/auth";

/**
 * Pure predicates shared by the UI (to decide what to render) and the server
 * actions (to decide what to allow). They are not the security boundary —
 * RLS is — but keeping both sides on one set of rules stops the dashboard
 * from offering buttons the database will refuse.
 */

export function isAdmin(user: SessionUser | null): boolean {
  return user?.profile.role === "ADMIN";
}

export function isTeacher(user: SessionUser | null): boolean {
  return user?.profile.role === "TEACHER";
}

export function isStudent(user: SessionUser | null): boolean {
  return user?.profile.role === "STUDENT";
}

export function isStaff(user: SessionUser | null): boolean {
  return isAdmin(user) || isTeacher(user);
}

export function canManageTeachers(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export function canManageStudents(user: SessionUser | null): boolean {
  return isStaff(user);
}

export function canCreateClass(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export function canViewReports(user: SessionUser | null): boolean {
  return isStaff(user);
}

export function canManageSettings(user: SessionUser | null): boolean {
  return isAdmin(user);
}

/** Teachers only ever touch their own classes. */
export function canEditClass(
  user: SessionUser | null,
  klass: Pick<ClassRow, "teacher_id"> | null,
): boolean {
  if (!user || !klass) return false;
  return isAdmin(user) || klass.teacher_id === user.id;
}

/** Deleting/archiving a class is destructive and stays admin-only. */
export function canArchiveClass(user: SessionUser | null): boolean {
  return isAdmin(user);
}

/** Recording scores, attendance, notes and homework. */
export function canRecordSessions(
  user: SessionUser | null,
  klass: Pick<ClassRow, "teacher_id"> | null,
): boolean {
  return canEditClass(user, klass);
}

export function canAddStudentToClass(
  user: SessionUser | null,
  klass: Pick<ClassRow, "teacher_id" | "status"> | null,
): boolean {
  if (!klass || klass.status !== "ACTIVE") return false;
  return canEditClass(user, klass);
}
