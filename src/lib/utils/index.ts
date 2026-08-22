import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------------------------------------------------------------------
 * Scores
 * ------------------------------------------------------------------- */

/**
 * Mean of the scored sessions only. Sessions without a score are skipped
 * rather than counted as zero — a lesson not yet graded must not drag the
 * average down. Mirrors `recompute_monthly_progress` in migration 005.
 */
export function averageScore(scores: Array<number | null | undefined>): number | null {
  const valid = scores.filter((s): s is number => typeof s === "number" && !Number.isNaN(s));
  if (valid.length === 0) return null;
  const sum = valid.reduce((total, s) => total + s, 0);
  return roundTo(sum / valid.length, 2);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Scores always render with two decimals so columns line up: `8.60 / 10`. */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return score.toFixed(2);
}

/** Compact form for dense grids, where `8.5` reads better than `8.50`. */
export function formatScoreCompact(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return String(roundTo(score, 2));
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "—";
  return `${roundTo(value, decimals).toFixed(decimals)}%`;
}

/** Traffic-light banding used by score badges and progress bars. */
export function scoreTone(score: number | null | undefined): "success" | "warning" | "danger" | "neutral" {
  if (score === null || score === undefined) return "neutral";
  if (score >= 8) return "success";
  if (score >= 6.5) return "warning";
  return "danger";
}

/* ---------------------------------------------------------------------
 * Dates and periods
 * ------------------------------------------------------------------- */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type Period = { year: number; month: number };

export function currentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatPeriod({ year, month }: Period): string {
  return `${MONTH_NAMES[month - 1] ?? "?"} ${year}`;
}

/** `2026-08` — the value used in URL query strings and <select> options. */
export function periodToParam({ year, month }: Period): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parsePeriodParam(value: string | null | undefined): Period | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export function shiftPeriod({ year, month }: Period, delta: number): Period {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

/** Most recent `count` periods, newest first — powers the month pickers. */
export function recentPeriods(count: number, from: Period = currentPeriod()): Period[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(from, -i));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Coarse "3 hours ago" phrasing for the activity feed. */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

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

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return formatter.format(-Math.floor(seconds / chosen[1]), chosen[0]);
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/* ---------------------------------------------------------------------
 * Text
 * ------------------------------------------------------------------- */

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Digits only, so `090 123 4567` and `0901234567` compare equal. */
export function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9]/g, "");
}

/** PostgREST treats `,` and `)` as syntax inside `or=(...)` filters. */
export function escapeFilterValue(value: string): string {
  return value.replace(/[,()*]/g, " ").trim();
}
