import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Link href="/dashboard" aria-label="Tygamm home">
        <Logo />
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Page not found</h1>
        <p className="max-w-sm text-sm text-ink-muted">
          The page you are looking for does not exist, or you do not have access to it.
        </p>
      </div>

      <LinkButton href="/dashboard">Back to dashboard</LinkButton>
    </div>
  );
}
