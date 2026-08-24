"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/supabase/env";
import { actionError, actionOk, validationError, type ActionResult } from "@/lib/errors";
import {
  fieldErrorsFrom,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validations";

/**
 * Re-applies the language stored on the account.
 *
 * The cookie is per-browser, so signing in on a new machine would otherwise
 * show whatever Accept-Language guessed rather than the language this person
 * actually chose. Best-effort: a failure here must never block a sign-in that
 * has already succeeded.
 */
async function restoreLocaleFromProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", user.id)
      .maybeSingle<{ locale: string | null }>();

    if (!isLocale(data?.locale)) return;

    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, data.locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  } catch (error) {
    console.error("[tygamm] could not restore locale from profile:", error);
  }
}

/**
 * Sign in.
 *
 * A Server Action rather than a browser call so the session cookies are
 * written by the server on the same response that navigates — no window
 * where the client holds a token the server has not seen.
 */
export async function signInAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const dict = await getDictionary();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return validationError(dict.validation.checkForm, fieldErrorsFrom(parsed.error, dict));
  }

  let redirectTo = String(formData.get("redirectTo") ?? "/dashboard");
  // Only same-origin paths, so a crafted ?redirectTo= cannot bounce a user
  // off-site with a fresh session.
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) redirectTo = "/dashboard";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      // Deliberately vague: revealing which half was wrong helps enumeration.
      return { ok: false, error: dict.auth.invalidCredentials };
    }

    await restoreLocaleFromProfile(supabase);
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const dict = await getDictionary();
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return validationError(dict.validation.checkForm, fieldErrorsFrom(parsed.error, dict));
  }

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
  } catch (error) {
    return actionError(error);
  }

  // Always the same answer, whether or not the address exists.
  return actionOk(dict.auth.resetLinkSent);
}

/** Runs after the reset link has established a recovery session. */
export async function updatePasswordAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const dict = await getDictionary();

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return validationError(dict.validation.checkForm, fieldErrorsFrom(parsed.error, dict));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        error: dict.auth.resetLinkExpired,
      };
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return actionError(error);
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?reset=1");
}
