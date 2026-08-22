"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, null);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && !state.fieldErrors ? state.error : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {formError}
        </div>
      )}

      <Field label="New password" htmlFor="password" error={fieldErrors.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fieldErrors.password)}
        />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={fieldErrors.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
        />
      </Field>

      <Button type="submit" size="lg" loading={isPending} className="w-full">
        Update password
      </Button>
    </form>
  );
}
