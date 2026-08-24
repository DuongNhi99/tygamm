"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { signInAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/env";
import { useDict } from "@/lib/i18n/client";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(signInAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const dict = useDict();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && !state.fieldErrors ? state.error : null;

  /**
   * Google sign-in works as soon as the provider is enabled in the Supabase
   * dashboard. Until then Supabase returns a clear error, which we surface
   * rather than hiding the button and pretending it does not exist.
   */
  async function signInWithGoogle() {
    setOauthPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(redirectTo ?? "/dashboard")}`,
        },
      });
      if (error) throw error;
    } catch {
      toast.error(dict.auth.googleNotEnabled);
      setOauthPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />

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

        <Field label={dict.auth.password} htmlFor="password" error={fieldErrors.password} required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="pr-11"
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? dict.auth.hidePassword : dict.auth.showPassword}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" loading={isPending} className="w-full">
          {dict.common.signIn}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-brand hover:text-brand-hover"
        >
          {dict.auth.forgotPassword}
        </Link>
      </div>

      <div className="flex items-center gap-3" role="separator">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium tracking-wide text-ink-subtle uppercase">
          {dict.auth.or}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={signInWithGoogle}
        loading={oauthPending}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
          />
        </svg>
        {dict.auth.continueWithGoogle}
      </Button>
    </div>
  );
}
