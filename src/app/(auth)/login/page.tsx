import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { LoginForm } from "./login-form";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  inactive: "Your account has been deactivated. Please contact your administrator.",
  link_expired: "That link has expired. Please request a new one.",
  forbidden: "You do not have access to that page.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back 👋</h1>
          <p className="text-sm text-ink-muted">Sign in to manage your classes and students.</p>
        </div>

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Supabase is not configured</p>
              <p>
                Copy <code className="font-mono">.env.example</code> to{" "}
                <code className="font-mono">.env.local</code>, add your project URL and anon key,
                then restart the dev server.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {errorMessage}
          </div>
        )}

        <LoginForm redirectTo={params.redirectTo} />
      </CardContent>
    </Card>
  );
}
