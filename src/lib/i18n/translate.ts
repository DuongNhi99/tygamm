import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

export type { Dictionary };

/**
 * Fills `{name}` placeholders in a dictionary string.
 *
 * Deliberately not a template-literal type: the dictionary is already fully
 * type-checked as an object, and a placeholder typo shows up immediately as
 * an unreplaced `{name}` on screen rather than being silently dropped.
 */
export function interpolate(
  template: string,
  vars?: Record<string, string | number | null | undefined>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === null || value === undefined ? match : String(value);
  });
}

/**
 * Picks between the `_one` and `_other` variants of a counted string.
 *
 * English is the only locale here that inflects; `vi` and `zh-CN` set both
 * variants to the same sentence, so this stays correct without a per-locale
 * plural rule table.
 */
export function plural(
  variants: { one: string; other: string },
  count: number,
  vars?: Record<string, string | number | null | undefined>,
): string {
  return interpolate(count === 1 ? variants.one : variants.other, { count, ...vars });
}

/* ---------------------------------------------------------------------
 * Locale-aware formatting
 * ------------------------------------------------------------------- */

export interface Formatters {
  locale: Locale;
  /** Month name for a 1-based month number. */
  monthName(month: number): string;
  /** Short month name for a 1-based month number — chart axes. */
  shortMonthName(month: number): string;
  /** "August 2026" / "Tháng 8 2026" / "2026 年 8 月". */
  formatPeriod(period: { year: number; month: number }): string;
  formatDate(value: string | Date | null | undefined): string;
  formatRelativeTime(value: string | Date | null | undefined): string;
  greeting(date?: Date): string;
}

/**
 * Everything that used to be hard-coded to `en-GB` in `lib/utils`.
 *
 * Built once per request from the dictionary rather than reading a global,
 * so a Server Component and a Client Component render the same strings for
 * the same locale and hydration matches.
 */
export function createFormatters(locale: Locale, dict: Dictionary): Formatters {
  const tag = LOCALE_TAGS[locale] ?? LOCALE_TAGS[DEFAULT_LOCALE];

  const monthName = (month: number) => dict.months.long[month - 1] ?? "?";
  const shortMonthName = (month: number) => dict.months.short[month - 1] ?? "?";

  return {
    locale,
    monthName,
    shortMonthName,

    // Chinese writes the year first: "2026 年 8 月". The other two put the
    // month first, so the order is part of the translation, not a format
    // string applied uniformly.
    formatPeriod: ({ year, month }) =>
      locale === "zh-CN" ? `${year} 年 ${month} 月` : `${monthName(month)} ${year}`,

    formatDate: (value) => {
      if (!value) return "—";
      const date = typeof value === "string" ? new Date(value) : value;
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString(tag, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },

    formatRelativeTime: (value) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      if (Number.isNaN(date.getTime())) return "";

      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) return dict.time.justNow;

      const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
        ["minute", 60],
        ["hour", 3600],
        ["day", 86400],
        ["month", 2592000],
        ["year", 31536000],
      ];

      let chosen: [Intl.RelativeTimeFormatUnit, number] = units[0];
      for (const unit of units) {
        if (seconds >= unit[1]) chosen = unit;
      }

      return new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(
        -Math.floor(seconds / chosen[1]),
        chosen[0],
      );
    },

    greeting: (date = new Date()) => {
      const hour = date.getHours();
      if (hour < 12) return dict.time.goodMorning;
      if (hour < 18) return dict.time.goodAfternoon;
      return dict.time.goodEvening;
    },
  };
}
