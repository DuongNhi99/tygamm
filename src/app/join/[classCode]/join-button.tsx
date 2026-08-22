"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinClassAction } from "../actions";

export function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function join() {
    startTransition(async () => {
      const result = await joinClassAction(code);
      if (result.ok) {
        toast.success("You have joined the class");
        router.push(`/classes/${result.data}`);
      } else {
        toast.error(result.error);
        router.refresh();
      }
    });
  }

  return (
    <Button size="lg" className="w-full" onClick={join} loading={isPending}>
      Join this class
    </Button>
  );
}
