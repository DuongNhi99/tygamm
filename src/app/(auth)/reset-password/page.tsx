import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Choose a new password
          </h1>
          <p className="text-sm text-ink-muted">
            Pick something at least 8 characters long that you have not used before.
          </p>
        </div>

        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
