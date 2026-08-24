import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.resetTitle };
}

export default async function ResetPasswordPage() {
  const dict = await getDictionary();

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {dict.auth.resetTitle}
          </h1>
          <p className="text-sm text-ink-muted">{dict.auth.resetSubtitle}</p>
        </div>

        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
