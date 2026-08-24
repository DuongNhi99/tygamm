import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { LoginForm } from "./login-form";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.signInMeta };
}

/** `?error=` codes the proxy and the auth callback redirect here with. */
function errorMessage(code: string | undefined, dict: Dictionary): string | null {
  switch (code) {
    case "inactive":
      return dict.auth.errorInactive;
    case "link_expired":
      return dict.auth.errorLinkExpired;
    case "forbidden":
      return dict.auth.errorForbidden;
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const [params, dict] = await Promise.all([searchParams, getDictionary()]);
  const message = errorMessage(params.error, dict);

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {dict.auth.signInTitle}
          </h1>
          <p className="text-sm text-ink-muted">{dict.auth.signInSubtitle}</p>
        </div>

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">{dict.auth.notConfiguredTitle}</p>
              <p>{dict.auth.notConfiguredBody}</p>
            </div>
          </div>
        )}

        {message && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {message}
          </div>
        )}

        <LoginForm redirectTo={params.redirectTo} />
      </CardContent>
    </Card>
  );
}
