import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import type { ProfileRow, Role, UserStatus } from "@/types/database";
import type { TeacherSummary } from "@/types/student";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations";

export { hasServiceRole };

/** Teachers with their class and student counts (admin-only page). */
export async function listTeachers(search?: string): Promise<TeacherSummary[]> {
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*").eq("role", "TEACHER");

  if (search?.trim()) {
    const term = search.trim().replace(/[,()*]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error } = await query.order("full_name");
  if (error) throw error;

  const teachers = (data ?? []) as ProfileRow[];
  if (teachers.length === 0) return [];

  const teacherIds = teachers.map((t) => t.id);

  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, teacher_id")
    .in("teacher_id", teacherIds)
    .neq("status", "ARCHIVED");

  if (classError) throw classError;

  const classRows = (classes ?? []) as Array<{ id: string; teacher_id: string | null }>;
  const classIds = classRows.map((c) => c.id);

  const { data: members, error: memberError } = classIds.length
    ? await supabase
        .from("class_members")
        .select("class_id, student_id")
        .in("class_id", classIds)
        .eq("status", "ACTIVE")
    : { data: [], error: null };

  if (memberError) throw memberError;

  const classToTeacher = new Map<string, string>();
  const classCounts = new Map<string, number>();
  for (const c of classRows) {
    if (!c.teacher_id) continue;
    classToTeacher.set(c.id, c.teacher_id);
    classCounts.set(c.teacher_id, (classCounts.get(c.teacher_id) ?? 0) + 1);
  }

  // A student in two of the same teacher's classes is still one student.
  const studentsPerTeacher = new Map<string, Set<string>>();
  for (const m of (members ?? []) as Array<{ class_id: string; student_id: string }>) {
    const teacherId = classToTeacher.get(m.class_id);
    if (!teacherId) continue;
    const set = studentsPerTeacher.get(teacherId) ?? new Set<string>();
    set.add(m.student_id);
    studentsPerTeacher.set(teacherId, set);
  }

  return teachers.map((teacher) => ({
    ...teacher,
    class_count: classCounts.get(teacher.id) ?? 0,
    student_count: studentsPerTeacher.get(teacher.id)?.size ?? 0,
  }));
}

export async function getTeacher(teacherId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", teacherId)
    .eq("role", "TEACHER")
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

/** Options for the "assign teacher" select. */
export async function listTeacherOptions(): Promise<Array<Pick<ProfileRow, "id" | "full_name">>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "TEACHER")
    .eq("status", "ACTIVE")
    .order("full_name");

  if (error) throw error;
  return (data ?? []) as Array<Pick<ProfileRow, "id" | "full_name">>;
}

/**
 * Temporary password for a newly created account.
 *
 * `createUser` does not email anyone, and this app makes no assumptions about
 * SMTP being configured, so the admin is shown the password once and passes
 * it on. The recipient changes it from Settings, or via "Forgot password".
 */
function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
  // Guarantees the mixed-case/digit shape most password policies expect.
  return `Ab3${body}`;
}

export interface CreatedAccount {
  id: string;
  temporaryPassword: string;
}

/**
 * Creates a teacher or student account.
 *
 * Requires the service-role key: only the Auth Admin API can mint a user.
 * The role travels in `app_metadata`, which clients cannot write — the
 * `handle_new_user` trigger reads it from there and refuses to trust
 * `user_metadata` for anything privilege-related.
 *
 * Callers must have already established that the caller is an admin.
 */
export async function createUserAccount(input: CreateUserInput): Promise<CreatedAccount> {
  const admin = createAdminClient();
  const temporaryPassword = generateTemporaryPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, phone: input.phone },
    app_metadata: { role: input.role },
  });

  if (error) {
    if (/already/i.test(error.message)) throw new Error("profiles_email_key");
    throw error;
  }
  if (!data.user) throw new Error("Account creation returned no user");

  // handle_new_user() has created the profile row by now; make sure the
  // details match exactly what was typed into the form.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      role: input.role as Role,
    })
    .eq("id", data.user.id);

  if (profileError) throw profileError;

  return { id: data.user.id, temporaryPassword };
}

/** Name, phone and active/inactive. Role changes are not exposed in the UI. */
export async function updateUserProfile(input: UpdateUserInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone,
      status: input.status as UserStatus,
    })
    .eq("id", input.id);

  if (error) throw error;
}

/** Soft delete (§29) — the account is kept so its history stays readable. */
export async function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw error;
}
