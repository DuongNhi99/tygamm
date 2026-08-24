import type { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { getAppSettings } from "@/services/settings.service";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguagePicker } from "@/components/settings/language-picker";
import { AppSettingsForm, ProfileSettingsForm } from "@/components/settings/settings-forms";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.settings.meta };
}

export default async function SettingsPage() {
  const [user, dict] = await Promise.all([requireAuth(), getDictionary()]);
  const isAdmin = canManageSettings(user);
  const settings = isAdmin ? await getAppSettings() : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={dict.settings.title}
        description={interpolate(dict.settings.signedInAs, {
          email: user.profile.email ?? user.profile.full_name,
          role: dict.roles[user.profile.role],
        })}
      />

      <div className="space-y-6">
        <ProfileSettingsForm profile={user.profile} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{dict.language.title}</CardTitle>
              <p className="text-sm text-ink-muted">{dict.language.description}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <LanguagePicker />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{dict.settings.appearance}</CardTitle>
              <p className="text-sm text-ink-muted">{dict.settings.appearanceHint}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{dict.settings.passwordTitle}</CardTitle>
              <p className="text-sm text-ink-muted">{dict.settings.passwordHint}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <LinkButton href="/forgot-password" variant="outline">
              {dict.settings.sendResetLink}
            </LinkButton>
          </CardContent>
        </Card>

        {settings && <AppSettingsForm settings={settings} />}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>{dict.settings.management}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-2">
              <LinkButton href="/teachers" variant="outline">
                {dict.settings.manageTeachers}
              </LinkButton>
              <LinkButton href="/students" variant="outline">
                {dict.settings.manageStudents}
              </LinkButton>
              <LinkButton href="/classes" variant="outline">
                {dict.settings.manageClasses}
              </LinkButton>
            </CardContent>
          </Card>
        )}

        <p className="pb-2 text-center text-xs text-ink-subtle">
          {dict.app.name} ·{" "}
          <Link href="/dashboard" className="hover:text-ink">
            {dict.settings.backToDashboard}
          </Link>
        </p>
      </div>
    </div>
  );
}
