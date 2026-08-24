"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useDict } from "@/lib/i18n/client";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null);
  const dict = useDict();

  if (state?.ok) {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p>{state.data}</p>
      </div>
    );
  }

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

      <Field label={dict.common.email} htmlFor="email" error={fieldErrors.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={dict.auth.emailPlaceholder}
          aria-invalid={Boolean(fieldErrors.email)}
        />
      </Field>

      <Button type="submit" size="lg" loading={isPending} className="w-full">
        {dict.auth.sendResetLink}
      </Button>
    </form>
  );
}
