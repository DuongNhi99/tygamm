"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { createUserAction } from "@/app/(dashboard)/students/actions";
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
        toast.success(`${role === "TEACHER" ? "Teacher" : "Student"} account created`, {
          description: `Temporary password: ${result.data}`,
          duration: 20000,
        });
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
        description="The account is created immediately with a temporary password."
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="create-user-form" loading={isPending}>
              Create account
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

          <Field label="Full name" htmlFor="cu_full_name" error={fieldErrors.full_name} required>
            <Input id="cu_full_name" name="full_name" required placeholder="Nguyen Van A" />
          </Field>

          <Field
            label="Email"
            htmlFor="cu_email"
            error={fieldErrors.email}
            hint="Used to sign in."
            required
          >
            <Input
              id="cu_email"
              name="email"
              type="email"
              required
              placeholder="teacher@example.com"
            />
          </Field>

          <Field label="Phone" htmlFor="cu_phone" error={fieldErrors.phone}>
            <Input id="cu_phone" name="phone" type="tel" placeholder="0901234567" />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
