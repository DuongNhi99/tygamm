/**
 * Locale plumbing shared by the server, the proxy and the client provider.
 *
 * The locale lives in a cookie rather than the URL: every route in this app
 * sits behind auth, so there is nothing to share or index per language, and
 * a path prefix would mean rewriting every Link and redirect for no gain.
 */

export const LOCALES = ["en", "vi", "zh-CN"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "tygamm-locale";

/** One year — a language choice should outlive a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Shown in the language picker, each in its own language (§55). */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  "zh-CN": "简体中文",
};

/** BCP 47 tags for `Intl` and the `<html lang>` attribute. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  vi: "vi-VN",
  "zh-CN": "zh-CN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best supported locale for an `Accept-Language` header.
 *
 * Hand-rolled rather than pulling in Negotiator + intl-localematcher: with
 * three locales the whole job is "sort by q, match language subtag first".
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.trim().toLowerCase(), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    // Exact tag: `zh-cn`.
    const exact = LOCALES.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;

    // Chinese is split by script, not just region: zh-Hans, zh-SG and plain
    // `zh` are Simplified; zh-TW / zh-HK / zh-Hant are not, and fall through
    // to the default rather than being served the wrong script.
    if (tag === "zh" || tag.startsWith("zh-hans") || tag === "zh-sg" || tag === "zh-my") {
      return "zh-CN";
    }
    if (tag.startsWith("zh-")) continue;

    // Everything else matches on the language subtag: `vi-VN` -> `vi`.
    const base = tag.split("-")[0];
    const byLanguage = LOCALES.find((locale) => locale.split("-")[0] === base);
    if (byLanguage) return byLanguage;
  }

  return DEFAULT_LOCALE;
}
