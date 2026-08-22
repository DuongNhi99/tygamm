"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { ROLE_LABELS } from "@/types/auth";
import type { Profile } from "@/types/auth";

export function UserMenu({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dropdown
      label="Account menu"
      trigger={
        <span className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-muted">
          <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
          <span className="hidden text-left sm:block">
            <span className="block max-w-32 truncate text-sm font-medium text-ink">
              {profile.full_name}
            </span>
            <span className="block text-xs text-ink-subtle">{ROLE_LABELS[profile.role]}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
        </span>
      }
    >
      {(close) => (
        <>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{profile.full_name}</p>
            <p className="truncate text-xs text-ink-muted">{profile.email}</p>
          </div>

          <DropdownSeparator />

          <Link
            href="/settings"
            onClick={close}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-muted"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>

          <DropdownSeparator />

          <DropdownItem
            destructive
            disabled={isPending}
            onClick={() => startTransition(() => void signOutAction())}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Signing out…" : "Sign out"}
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
