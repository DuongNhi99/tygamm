import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { getAppSettings } from "@/services/settings.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AppSettingsForm, ProfileSettingsForm } from "@/components/settings/settings-forms";
import { ROLE_LABELS } from "@/types/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireAuth();
  const isAdmin = canManageSettings(user);
  const settings = isAdmin ? await getAppSettings() : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description={`Signed in as ${user.profile.email ?? user.profile.full_name} · ${ROLE_LABELS[user.profile.role]}`}
      />

      <div className="space-y-6">
        <ProfileSettingsForm profile={user.profile} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Appearance</CardTitle>
              <p className="text-sm text-ink-muted">
                Follow your system setting, or pick light or dark.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Password</CardTitle>
              <p className="text-sm text-ink-muted">
                We email you a secure link rather than asking for your current password.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <LinkButton href="/forgot-password" variant="outline">
              Send password reset link
            </LinkButton>
          </CardContent>
        </Card>

        {settings && <AppSettingsForm settings={settings} />}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-2">
              <LinkButton href="/teachers" variant="outline">
                Manage teachers
              </LinkButton>
              <LinkButton href="/students" variant="outline">
                Manage students
              </LinkButton>
              <LinkButton href="/classes" variant="outline">
                Manage classes
              </LinkButton>
            </CardContent>
          </Card>
        )}

        <p className="pb-2 text-center text-xs text-ink-subtle">
          Tygamm ·{" "}
          <Link href="/dashboard" className="hover:text-ink">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
