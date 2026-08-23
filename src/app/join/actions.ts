"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { actionError, actionOk, validationError, type ActionResult } from "@/lib/errors";
import { joinClassSchema } from "@/lib/validations";

/**
 * Joining goes through the `join_class` RPC, not a direct insert.
 *
 * Students have no INSERT policy on `class_members` — the RPC is
 * SECURITY DEFINER and re-checks every rule itself (class exists, is active,
 * has room, and the caller is not already enrolled), all under a row lock so
 * two simultaneous joins cannot both take the last seat.
 */
export async function joinClassAction(code: string): Promise<ActionResult<string>> {
  await requireAuth();

  const parsed = joinClassSchema.safeParse({ code });
  if (!parsed.success) return validationError("Enter a valid class code");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("join_class", { p_code: parsed.data.code });
    if (error) throw error;

    revalidatePath("/dashboard");
    revalidatePath("/classes");
    return actionOk(data as string);
  } catch (error) {
    return actionError(error);
  }
}
