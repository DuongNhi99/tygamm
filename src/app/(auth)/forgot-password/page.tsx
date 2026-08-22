import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Forgot your password?</h1>
          <p className="text-sm text-ink-muted">
            Enter your email and we&apos;ll send you a link to choose a new one.
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
