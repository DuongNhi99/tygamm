"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import {
  updateAppSettingsAction,
  updateProfileAction,
} from "@/app/(dashboard)/settings/actions";
import type { AppSettingsRow, ProfileRow } from "@/types/database";

export function ProfileSettingsForm({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfileAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Profile updated");
      router.refresh();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Your profile</CardTitle>
            <p className="text-sm text-ink-muted">
              Your role and account status are managed by an administrator.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field label="Full name" htmlFor="full_name" error={fieldErrors.full_name} required>
            <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
          </Field>

          <Field label="Email" htmlFor="profile_email" hint="Contact an administrator to change this.">
            <Input id="profile_email" value={profile.email ?? ""} disabled readOnly />
          </Field>

          <Field label="Phone" htmlFor="phone" error={fieldErrors.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
          </Field>

          <Field
            label="Avatar URL"
            htmlFor="avatar_url"
            error={fieldErrors.avatar_url}
            hint="A link to a square image. Leave blank to use your initials."
          >
            <Input
              id="avatar_url"
              name="avatar_url"
              type="url"
              defaultValue={profile.avatar_url ?? ""}
              placeholder="https://..."
            />
          </Field>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" loading={isPending}>
            Save profile
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function AppSettingsForm({ settings }: { settings: AppSettingsRow }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAppSettingsAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Settings saved");
      router.refresh();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Centre settings</CardTitle>
            <p className="text-sm text-ink-muted">Applies to everyone at the centre.</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field label="Centre name" htmlFor="center_name" error={fieldErrors.center_name} required>
            <Input
              id="center_name"
              name="center_name"
              defaultValue={settings.center_name}
              required
            />
          </Field>

          <Field
            label="Default lessons per month"
            htmlFor="default_sessions_per_month"
            error={fieldErrors.default_sessions_per_month}
            hint="Pre-filled when creating a class. Each class can still override it."
            required
          >
            <Input
              id="default_sessions_per_month"
              name="default_sessions_per_month"
              type="number"
              min={1}
              max={31}
              defaultValue={settings.default_sessions_per_month}
              required
            />
          </Field>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" loading={isPending}>
            Save settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
