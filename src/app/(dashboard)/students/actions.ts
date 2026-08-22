"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/errors";
import { createUserSchema, fieldErrorsFrom, updateUserSchema } from "@/lib/validations";
import { createUserAccount, hasServiceRole, updateUserProfile } from "@/services/teacher.service";

/**
 * Creates a person (teacher or student).
 *
 * Only an admin may do this, and only through the Auth Admin API — which is
 * why the service-role key is required. The temporary password is returned
 * once so the admin can pass it on; nothing stores or emails it.
 */
export async function createUserAction(
  role: "TEACHER" | "STUDENT",
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  if (!hasServiceRole) {
    return {
      ok: false,
      error:
        "Creating accounts needs SUPABASE_SERVICE_ROLE_KEY in .env.local (server-side only). " +
        "Add it and restart the dev server.",
    };
  }

  const parsed = createUserSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role,
  });

  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    const account = await createUserAccount(parsed.data);
    revalidatePath(role === "TEACHER" ? "/teachers" : "/students");
    revalidatePath("/dashboard");
    return actionOk(account.temporaryPassword);
  } catch (error) {
    return actionError(error);
  }
}

/** Edit a person's name, phone and active/inactive state. Admin-only (§29). */
export async function updateUserAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    await updateUserProfile(parsed.data);
    revalidatePath("/teachers");
    revalidatePath("/students");
    revalidatePath(`/students/${parsed.data.id}`);
    revalidatePath(`/teachers/${parsed.data.id}`);
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/** Used by the class page to check whether account creation is available. */
export async function serviceRoleAvailableAction(): Promise<boolean> {
  await requireStaff();
  return hasServiceRole;
}
