"use client";

import type { ReactNode } from "react";

/**
 * Shared chart chrome.
 *
 * Colour decisions, once, for every chart in the app:
 *  - Every chart plots a SINGLE measure, so every mark is one hue (brand).
 *    A single series needs no legend — the card title names what is plotted.
 *  - Text never wears the data colour; labels and axes use ink tokens.
 *  - Attendance deliberately avoids a green/red donut: those two hues sit at
 *    ΔE 4.1 under deuteranopia, i.e. indistinguishable for red-green
 *    colourblind readers. It is rendered as a meter plus labelled counts
 *    instead (see AttendanceSummary), which is also exactly what §24 asks for.
 */

export const CHART_COLORS = {
  mark: "var(--brand)",
  wash: "var(--brand)",
  grid: "var(--line)",
  axis: "var(--ink-subtle)",
  surface: "var(--card)",
} as const;

export const AXIS_TICK = { fill: "var(--ink-muted)", fontSize: 12 } as const;

/**
 * The subset of Recharts' tooltip payload this app actually reads. Declared
 * structurally rather than imported, because Recharts' own generics resolve
 * differently between the element and render-prop forms of `content`.
 */
export interface TooltipRenderProps {
  active?: boolean;
  label?: ReactNode;
  payload?: ReadonlyArray<{ value?: unknown }>;
}

/** Tooltip in card colours, so it reads as part of the app, not the library. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  unit,
}: TooltipRenderProps & {
  formatter?: (value: number) => string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;

  const raw = payload[0]?.value;
  if (raw === undefined || raw === null) return null;

  const numeric = Number(raw);
  if (Number.isNaN(numeric)) return null;

  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-ink">{label}</p>
      <p className="text-ink-muted tabular-nums">
        {formatter ? formatter(numeric) : String(raw)}
        {unit}
      </p>
    </div>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-ink-muted">{message}</div>
  );
}
