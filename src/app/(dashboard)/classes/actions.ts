"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/errors";
import { classSchema, fieldErrorsFrom } from "@/lib/validations";
import { canEditClass } from "@/lib/permissions";
import {
  archiveClass,
  createClass,
  getClassById,
  isClassCodeTaken,
  setClassCode,
  suggestClassCode,
  updateClass,
} from "@/services/class.service";

function formToClassInput(formData: FormData) {
  return {
    name: formData.get("name"),
    code: formData.get("code"),
    class_type: formData.get("class_type"),
    max_students: formData.get("max_students"),
    teacher_id: formData.get("teacher_id"),
    sessions_per_month: formData.get("sessions_per_month"),
    start_date: formData.get("start_date"),
    status: formData.get("status"),
  };
}

/** Creating classes is admin-only (§6). RLS enforces the same rule. */
export async function createClassAction(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const parsed = classSchema.safeParse(formToClassInput(formData));
  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    if (await isClassCodeTaken(parsed.data.code)) {
      return actionError("classes_code_key", { code: "That class code is already in use." });
    }

    const created = await createClass(parsed.data);
    revalidatePath("/classes");
    revalidatePath("/dashboard");
    return actionOk(created.id);
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Admins may edit any class; a teacher only their own. Checked here so the
 * user gets a clear message, and again by RLS so the rule actually holds.
 */
export async function updateClassAction(
  classId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireStaff();

  const existing = await getClassById(classId);
  if (!existing) return actionError("CLASS_NOT_FOUND");
  if (!canEditClass(user, existing)) return actionError("FORBIDDEN");

  const parsed = classSchema.safeParse(formToClassInput(formData));
  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  // A teacher must not be able to hand their class to someone else.
  if (user.profile.role !== "ADMIN" && parsed.data.teacher_id !== existing.teacher_id) {
    return actionError("FORBIDDEN", { teacher_id: "Only an admin can reassign a class." });
  }

  try {
    if (await isClassCodeTaken(parsed.data.code, classId)) {
      return actionError("classes_code_key", { code: "That class code is already in use." });
    }

    await updateClass(classId, parsed.data);
    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    revalidatePath("/dashboard");
    return actionOk(classId);
  } catch (error) {
    return actionError(error);
  }
}

/** Archive, never delete — the lesson history has to survive (§29, §50). */
export async function archiveClassAction(classId: string): Promise<ActionResult<void>> {
  await requireAdmin();

  try {
    await archiveClass(classId);
    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    revalidatePath("/dashboard");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/** Suggests a fresh, unused code for the create/edit form. */
export async function suggestClassCodeAction(
  name: string,
  startDate?: string | null,
): Promise<ActionResult<string>> {
  await requireStaff();

  try {
    return actionOk(await suggestClassCode(name || "Class", startDate));
  } catch (error) {
    return actionError(error);
  }
}

export async function regenerateClassCodeAction(
  classId: string,
): Promise<ActionResult<string>> {
  const user = await requireStaff();

  const existing = await getClassById(classId);
  if (!existing) return actionError("CLASS_NOT_FOUND");
  if (!canEditClass(user, existing)) return actionError("FORBIDDEN");

  try {
    const code = await suggestClassCode(existing.name, existing.start_date);
    await setClassCode(classId, code);
    revalidatePath(`/classes/${classId}`);
    revalidatePath("/classes");
    return actionOk(code);
  } catch (error) {
    return actionError(error);
  }
}
