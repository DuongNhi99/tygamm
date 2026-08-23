"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

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
  useEffect(() => {
    console.error("[tygamm] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Logo />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Something went wrong</h1>
        <p className="max-w-sm text-sm text-ink-muted">
          We could not load this page. Please try again.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-ink-subtle">Reference: {error.digest}</p>
        )}
      </div>

      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
