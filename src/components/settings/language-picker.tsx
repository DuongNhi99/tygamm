"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { setLocaleAction } from "@/app/(dashboard)/settings/actions";

/**
 * Interface language (§55, alongside the theme toggle).
 *
 * Each option is written in its own language, never translated — someone
 * looking for Vietnamese scans for "Tiếng Việt", not for whatever the
 * current locale calls it.
 *
 * The change is applied server-side so the cookie and the profile move
 * together; `router.refresh()` then re-renders the tree with the new
 * dictionary rather than reloading the page.
 */
export function LanguagePicker() {
  const router = useRouter();
  const { locale, dict } = useI18n();
  const [isPending, startTransition] = useTransition();

  function choose(next: string) {
    if (next === locale) return;

    startTransition(async () => {
      const result = await setLocaleAction(next);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <label className="block sm:max-w-xs">
      <span className="sr-only">{dict.language.label}</span>
      <Select
        value={locale}
        disabled={isPending}
        aria-label={dict.language.label}
        onChange={(event) => choose(event.target.value)}
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_NAMES[option]}
          </option>
        ))}
      </Select>
    </label>
  );
}
