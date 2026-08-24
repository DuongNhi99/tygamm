import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { LinkButton } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const dict = await getDictionary();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Link href="/dashboard" aria-label={dict.app.home}>
        <Logo />
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{dict.notFound.title}</h1>
        <p className="max-w-sm text-sm text-ink-muted">{dict.notFound.body}</p>
      </div>

      <LinkButton href="/dashboard">{dict.notFound.action}</LinkButton>
    </div>
  );
}
