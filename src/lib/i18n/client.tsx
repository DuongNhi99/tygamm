"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { createFormatters, type Dictionary, type Formatters } from "./translate";

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
  fmt: Formatters;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Carries the dictionary to Client Components.
 *
 * Server Components read the locale from the cookie directly; a Client
 * Component cannot, so the root layout serialises the dictionary once into
 * this provider rather than every interactive leaf prop-drilling its own
 * strings. One dictionary is a few KB — far less than the props it replaces.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, dict, fmt: createFormatters(locale, dict) }),
    [locale, dict],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Dictionary, locale and formatters for a Client Component.
 *
 * Throws outside the provider rather than silently falling back to English:
 * a component rendering the wrong language is a bug worth failing loudly on
 * in development.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside <I18nProvider> (mounted in the root layout).");
  }
  return value;
}

/** Just the dictionary, for the common case. */
export function useDict(): Dictionary {
  return useI18n().dict;
}

export { DEFAULT_LOCALE };
export type { Dictionary, Locale };
