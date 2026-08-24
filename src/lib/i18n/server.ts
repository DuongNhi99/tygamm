import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, matchLocale, type Locale } from "./config";
import { createFormatters, type Dictionary, type Formatters } from "./translate";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((module) => module.default),
  vi: () => import("./dictionaries/vi").then((module) => module.default),
  "zh-CN": () => import("./dictionaries/zh-CN").then((module) => module.default),
};

/**
 * The locale for this request.
 *
 * The proxy normally writes the cookie on the first visit, but a request
 * that never passes through it (a Server Action, a route the matcher skips)
 * still has to resolve something — hence the `Accept-Language` fallback
 * rather than defaulting straight to English.
 *
 * `cache` keeps it to one cookie read per render even though the layout,
 * the page and a dozen components all ask.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  try {
    const headerStore = await headers();
    return matchLocale(headerStore.get("accept-language"));
  } catch {
    // No request scope (a build-time render); English is the safe answer.
    return DEFAULT_LOCALE;
  }
});

/** The dictionary for this request's locale. */
export const getDictionary = cache(async (): Promise<Dictionary> => {
  const locale = await getLocale();
  return dictionaries[locale]();
});

/**
 * Dictionary + locale + formatters in one call — what most Server
 * Components actually want.
 */
export const getI18n = cache(
  async (): Promise<{ locale: Locale; dict: Dictionary; fmt: Formatters }> => {
    const locale = await getLocale();
    const dict = await dictionaries[locale]();
    return { locale, dict, fmt: createFormatters(locale, dict) };
  },
);
