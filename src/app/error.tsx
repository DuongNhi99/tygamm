"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { useDict } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";

/**
 * Friendly failure page. The real error goes to the console for us; the user
 * never sees a stack trace or a database message (§38).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDict();

  useEffect(() => {
    console.error("[tygamm] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Logo />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{dict.errorPage.title}</h1>
        <p className="max-w-sm text-sm text-ink-muted">{dict.errorPage.body}</p>
        {error.digest && (
          <p className="font-mono text-xs text-ink-subtle">
            {interpolate(dict.errorPage.reference, { digest: error.digest })}
          </p>
        )}
      </div>

      <Button onClick={reset}>{dict.common.tryAgain}</Button>
    </div>
  );
}
