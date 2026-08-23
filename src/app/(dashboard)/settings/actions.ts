"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { actionError, actionOk, validationError, type ActionResult } from "@/lib/errors";
import { appSettingsSchema, fieldErrorsFrom, profileSchema } from "@/lib/validations";
import { updateAppSettings, updateOwnProfile } from "@/services/settings.service";

/** Anyone may edit their own profile — but only name, phone and avatar. */
export async function updateProfileAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const user = await requireAuth();

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    avatar_url: formData.get("avatar_url"),
  });

  if (!parsed.success) {
    return validationError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    // The user id comes from the session, never from the form — that is what
    // stops one user editing another's profile.
    await updateOwnProfile(user.id, parsed.data);
    revalidatePath("/", "layout");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/** Centre-wide settings. Admin-only here and in the RLS update policy. */
export async function updateAppSettingsAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  await requireAdmin();

  const parsed = appSettingsSchema.safeParse({
    center_name: formData.get("center_name"),
    default_sessions_per_month: formData.get("default_sessions_per_month"),
  });

  if (!parsed.success) {
    return validationError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    await updateAppSettings(parsed.data);
    revalidatePath("/settings");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}
