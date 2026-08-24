"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDict } from "@/lib/i18n/client";

/** Copies the class code, or the full invite URL for `/join/[classCode]`. */
export function CopyCodeButton({
  code,
  mode = "code",
  className,
}: {
  code: string;
  mode?: "code" | "invite";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const dict = useDict();

  async function copy() {
    const value = mode === "invite" ? `${window.location.origin}/join/${code}` : code;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(mode === "invite" ? dict.classes.inviteCopied : dict.classes.codeCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(dict.classes.copyFailed);
    }
  }

  const Icon = copied ? Check : mode === "invite" ? Link2 : Copy;

  return (
    <Button variant="outline" size="sm" onClick={copy} className={className}>
      <Icon className="h-4 w-4" />
      {mode === "invite" ? dict.classes.copyInvite : dict.classes.copyCode}
    </Button>
  );
}
