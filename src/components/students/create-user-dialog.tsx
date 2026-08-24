"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { createUserAction } from "@/app/(dashboard)/students/actions";
import { useDict } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";
import type { FieldErrors } from "@/lib/validations";

/**
 * Admin-side "add a teacher / add a student".
 *
 * The action is awaited inside the submit transition rather than through
 * `useActionState` + an effect: closing the dialog and refreshing are
 * consequences of the submit event, so they belong in the event handler.
 */
export function CreateUserDialog({
  role,
  buttonLabel,
}: {
  role: "TEACHER" | "STUDENT";
  buttonLabel: string;
}) {
  const router = useRouter();
  const dict = useDict();
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setFieldErrors({});
    setFormError(null);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createUserAction(role, null, formData);

      if (result.ok) {
        // Shown once, long enough to write down — it is never stored anywhere.
        toast.success(
          role === "TEACHER" ? dict.createUser.teacherCreated : dict.createUser.studentCreated,
          {
            description: interpolate(dict.createUser.temporaryPassword, {
              password: result.data,
            }),
            duration: 20000,
          },
        );
        close();
        router.refresh();
        return;
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setFormError(null);
      } else {
        setFieldErrors({});
        setFormError(result.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={buttonLabel}
        description={dict.createUser.dialogSubtitle}
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" form="create-user-form" loading={isPending}>
              {dict.createUser.createAccount}
            </Button>
          </>
        }
      >
        <form id="create-user-form" action={submit} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {formError}
            </div>
          )}

          <Field
            label={dict.common.fullName}
            htmlFor="cu_full_name"
            error={fieldErrors.full_name}
            required
          >
            <Input
              id="cu_full_name"
              name="full_name"
              required
              placeholder={dict.createUser.namePlaceholder}
            />
          </Field>

          <Field
            label={dict.common.email}
            htmlFor="cu_email"
            error={fieldErrors.email}
            hint={dict.createUser.emailHint}
            required
          >
            <Input
              id="cu_email"
              name="email"
              type="email"
              required
              placeholder={dict.createUser.emailPlaceholder}
            />
          </Field>

          <Field label={dict.common.phone} htmlFor="cu_phone" error={fieldErrors.phone}>
            <Input
              id="cu_phone"
              name="phone"
              type="tel"
              placeholder={dict.createUser.phonePlaceholder}
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
