"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { canAddStudentToClass, canRecordSessions } from "@/lib/permissions";
import { actionError, actionOk, validationError, type ActionResult } from "@/lib/errors";
import {
  bulkSessionSchema,
  createUserSchema,
  fieldErrorsFrom,
  sessionEntrySchema,
  studentSearchSchema,
} from "@/lib/validations";
import { getClassById } from "@/services/class.service";
import {
  addStudentToClass,
  findStudentsByContact,
  removeStudentFromClass,
} from "@/services/student.service";
import { createUserAccount, hasServiceRole } from "@/services/teacher.service";
import { bulkUpsertSessions, upsertSession } from "@/services/lesson.service";
import type { StudentSearchRow } from "@/types/database";

/**
 * Every action here re-derives the class and re-checks permission against it.
 * The `classId` arrives from the client, so it is never trusted on its own
 * (§33) — and RLS refuses the write regardless if the check is wrong.
 */
async function authorizeClass(classId: string, mode: "add" | "record") {
  const user = await requireStaff();
  const klass = await getClassById(classId);
  if (!klass) return { error: "CLASS_NOT_FOUND" as const };

  const allowed =
    mode === "add" ? canAddStudentToClass(user, klass) : canRecordSessions(user, klass);

  if (!allowed) {
    return {
      error: klass.status !== "ACTIVE" && mode === "add" ? ("CLASS_NOT_ACTIVE" as const) : ("FORBIDDEN" as const),
    };
  }

  return { user, klass };
}

/* --------------------------------------------------------------- members */

export async function searchStudentsAction(
  query: string,
): Promise<ActionResult<StudentSearchRow[]>> {
  await requireStaff();

  const parsed = studentSearchSchema.safeParse({ query });
  if (!parsed.success) return validationError("Enter at least 3 characters");

  try {
    return actionOk(await findStudentsByContact(parsed.data.query));
  } catch (error) {
    return actionError(error);
  }
}

export async function addStudentToClassAction(
  classId: string,
  studentId: string,
): Promise<ActionResult<void>> {
  const auth = await authorizeClass(classId, "add");
  if ("error" in auth) return actionError(auth.error);

  try {
    await addStudentToClass(classId, studentId);
    revalidateClass(classId);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * "Student not found → Create student" (§14). Needs the service-role key,
 * because minting an auth account is an Auth Admin API operation.
 */
export async function createAndAddStudentAction(
  classId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const auth = await authorizeClass(classId, "add");
  if ("error" in auth) return actionError(auth.error);

  if (!hasServiceRole) {
    return {
      ok: false,
      error:
        "Creating accounts needs SUPABASE_SERVICE_ROLE_KEY in .env.local. " +
        "Add it and restart the server, or add an existing student instead.",
    };
  }

  const parsed = createUserSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: "STUDENT",
  });

  if (!parsed.success) {
    return validationError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    const account = await createUserAccount(parsed.data);
    await addStudentToClass(classId, account.id);
    revalidateClass(classId);
    return actionOk(account.temporaryPassword);
  } catch (error) {
    return actionError(error);
  }
}

export async function removeStudentFromClassAction(
  classId: string,
  studentId: string,
): Promise<ActionResult<void>> {
  const auth = await authorizeClass(classId, "record");
  if ("error" in auth) return actionError(auth.error);

  try {
    await removeStudentFromClass(classId, studentId);
    revalidateClass(classId);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/* -------------------------------------------------------------- sessions */

/** One cell of the score grid: score, attendance, note and homework. */
export async function saveSessionAction(
  classId: string,
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const auth = await authorizeClass(classId, "record");
  if ("error" in auth) return actionError(auth.error);

  const parsed = sessionEntrySchema.safeParse({
    class_id: classId,
    student_id: formData.get("student_id"),
    period_year: formData.get("period_year"),
    period_month: formData.get("period_month"),
    session_number: formData.get("session_number"),
    lesson_date: formData.get("lesson_date"),
    score: formData.get("score"),
    attendance: formData.get("attendance"),
    teacher_note: formData.get("teacher_note"),
    homework: formData.get("homework"),
  });

  if (!parsed.success) {
    return validationError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  // The class row is the authority on how many lessons a month has.
  if (parsed.data.session_number > auth.klass.sessions_per_month) {
    return actionError("SESSION_NUMBER_OUT_OF_RANGE", {
      session_number: `This class has ${auth.klass.sessions_per_month} lessons per month.`,
    });
  }

  try {
    await upsertSession(parsed.data);
    revalidateClass(classId);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/** Mobile score entry: a whole month for one student in one submit (§53). */
export async function saveMonthAction(
  classId: string,
  input: {
    student_id: string;
    period_year: number;
    period_month: number;
    entries: Array<{ session_number: number; score: string; attendance: string }>;
  },
): Promise<ActionResult<void>> {
  const auth = await authorizeClass(classId, "record");
  if ("error" in auth) return actionError(auth.error);

  const parsed = bulkSessionSchema.safeParse({ class_id: classId, ...input });
  if (!parsed.success) {
    return validationError("Please check the scores", fieldErrorsFrom(parsed.error));
  }

  const tooHigh = parsed.data.entries.find(
    (entry) => entry.session_number > auth.klass.sessions_per_month,
  );
  if (tooHigh) return actionError("SESSION_NUMBER_OUT_OF_RANGE");

  try {
    await bulkUpsertSessions(parsed.data);
    revalidateClass(classId);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

function revalidateClass(classId: string) {
  revalidatePath(`/classes/${classId}`);
  revalidatePath(`/classes/${classId}/students`);
  revalidatePath(`/classes/${classId}/sessions`);
  revalidatePath(`/classes/${classId}/progress`);
  revalidatePath("/classes");
  revalidatePath("/dashboard");
  revalidatePath("/students");
}
