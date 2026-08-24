import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n/client";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

/** Title and description follow the reader's language, so they read as one
 *  piece with the page rather than an English frame around it (§44). */
export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();

  return {
    title: {
      default: dict.app.name,
      template: `%s · ${dict.app.name}`,
    },
    description: dict.app.description,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

/**
 * Applies the saved theme before first paint. Without this the page renders
 * light and then flips, which is worse than no dark mode at all.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("tygamm-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || ((!stored || stored === "system") && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The locale comes from the cookie the proxy seeds, so it is settled
  // before the first byte — nothing renders in English and then swaps.
  const { locale, dict } = await getI18n();

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Browser extensions (Kaspersky, etc.) inject their own script into
            <head> before hydration, which React reads as a mismatch here. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">
        <I18nProvider locale={locale} dict={dict}>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
