"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";
import { actionError, actionOk, type ActionResult } from "@/lib/errors";
import {
  fieldErrorsFrom,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validations";

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
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
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
      return { ok: false, error: "Incorrect email or password. Please try again." };
    }
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
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
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
  return actionOk(
    "If an account exists for that email, a password reset link is on its way.",
  );
}

/** Runs after the reset link has established a recovery session. */
export async function updatePasswordAction(
  _prev: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return actionError("Please check the form", fieldErrorsFrom(parsed.error));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        error: "This reset link has expired. Please request a new one.",
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
