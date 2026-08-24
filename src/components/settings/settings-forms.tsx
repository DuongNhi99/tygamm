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
import { useDict } from "@/lib/i18n/client";
import type { AppSettingsRow, ProfileRow } from "@/types/database";

export function ProfileSettingsForm({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfileAction, null);
  const dict = useDict();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(dict.settings.profileUpdated);
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
            <CardTitle>{dict.settings.profileTitle}</CardTitle>
            <p className="text-sm text-ink-muted">{dict.settings.profileHint}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field label={dict.common.fullName} htmlFor="full_name" error={fieldErrors.full_name} required>
            <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
          </Field>

          <Field label={dict.common.email} htmlFor="profile_email" hint={dict.settings.emailHint}>
            <Input id="profile_email" value={profile.email ?? ""} disabled readOnly />
          </Field>

          <Field label={dict.common.phone} htmlFor="phone" error={fieldErrors.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
          </Field>

          <Field
            label={dict.settings.avatarUrl}
            htmlFor="avatar_url"
            error={fieldErrors.avatar_url}
            hint={dict.settings.avatarHint}
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
            {dict.settings.saveProfile}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function AppSettingsForm({ settings }: { settings: AppSettingsRow }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAppSettingsAction, null);
  const dict = useDict();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(dict.settings.settingsSaved);
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
            <CardTitle>{dict.settings.centreTitle}</CardTitle>
            <p className="text-sm text-ink-muted">{dict.settings.centreHint}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field label={dict.settings.centreName} htmlFor="center_name" error={fieldErrors.center_name} required>
            <Input
              id="center_name"
              name="center_name"
              defaultValue={settings.center_name}
              required
            />
          </Field>

          <Field
            label={dict.settings.defaultSessions}
            htmlFor="default_sessions_per_month"
            error={fieldErrors.default_sessions_per_month}
            hint={dict.settings.defaultSessionsHint}
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
            {dict.settings.saveSettings}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
