"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { archiveClassAction } from "@/app/(dashboard)/classes/actions";
import { useDict } from "@/lib/i18n/client";

/** Destructive, so it always asks first — and never with window.confirm (§50). */
export function ArchiveClassButton({ classId, className }: { classId: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dict = useDict();

  function archive() {
    startTransition(async () => {
      const result = await archiveClassAction(classId);
      if (result.ok) {
        toast.success(dict.classes.archived);
        setOpen(false);
        router.push("/classes");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={className}>
        <Archive className="h-4 w-4" />
        {dict.classes.archive}
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={archive}
        loading={isPending}
        title={dict.classes.archiveTitle}
        description={dict.classes.archiveBody}
        confirmLabel={dict.classes.archiveConfirm}
      />
    </>
  );
}
