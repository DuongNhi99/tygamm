"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSessionUser, requireAdmin, requireAuth } from "@/lib/auth";
import { actionError, actionOk, validationError, type ActionResult } from "@/lib/errors";
import { appSettingsSchema, fieldErrorsFrom, profileSchema } from "@/lib/validations";
import { updateAppSettings, updateOwnLocale, updateOwnProfile } from "@/services/settings.service";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/server";

/** Anyone may edit their own profile — but only name, phone and avatar. */
export async function updateProfileAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const user = await requireAuth();
  const dict = await getDictionary();

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    avatar_url: formData.get("avatar_url"),
  });

  if (!parsed.success) {
    return validationError(dict.validation.checkForm, fieldErrorsFrom(parsed.error, dict));
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
  const dict = await getDictionary();

  const parsed = appSettingsSchema.safeParse({
    center_name: formData.get("center_name"),
    default_sessions_per_month: formData.get("default_sessions_per_month"),
  });

  if (!parsed.success) {
    return validationError(dict.validation.checkForm, fieldErrorsFrom(parsed.error, dict));
  }

  try {
    await updateAppSettings(parsed.data);
    revalidatePath("/settings");
    return actionOk();
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Switches the interface language.
 *
 * The cookie is what actually drives rendering — it is readable on signed-out
 * pages too, so the login screen and the public invite page stay translated.
 * The profile column is the durable copy, so the choice follows the user to
 * another browser instead of being stranded on one machine.
 *
 * The profile write is best-effort: a failure there must not stop the
 * language from changing in front of the user who just asked for it.
 */
export async function setLocaleAction(locale: string): Promise<ActionResult<void>> {
  if (!isLocale(locale)) return actionError("FORBIDDEN");

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  const user = await getSessionUser();
  if (user) {
    try {
      await updateOwnLocale(user.id, locale);
    } catch (error) {
      console.error("[tygamm] could not persist locale to profile:", error);
    }
  }

  // Every rendered string changes, so the whole tree is stale.
  revalidatePath("/", "layout");
  return actionOk();
}
