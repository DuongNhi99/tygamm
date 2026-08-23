import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tygamm",
    template: "%s · Tygamm",
  },
  description:
    "Class management for guitar teaching centres — classes, students, attendance, scores and monthly progress.",
};

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
    var stored = localStorage.getItem("abbaguitar-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || ((!stored || stored === "system") && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
