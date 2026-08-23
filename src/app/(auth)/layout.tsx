import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-4 py-6 sm:px-8">
        <Link href="/login" className="inline-block" aria-label="Tygamm home">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-ink-subtle">
        Tygamm · Class management for music teaching centres
      </footer>
    </div>
  );
}
