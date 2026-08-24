"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartEmpty, ChartTooltip } from "./chart-parts";
import { useI18n } from "@/lib/i18n/client";
import type { MonthlyPoint } from "@/services/dashboard.service";

/**
 * Average score over the last six months. One series, so no legend box —
 * 2px line, 8px markers with a surface ring, and a 10% wash beneath.
 */
export function ScoreTrendChart({ data }: { data: MonthlyPoint[] }) {
  const { dict, fmt } = useI18n();

  const hasData = data.some((point) => point.average !== null);
  if (!hasData) return <ChartEmpty message={dict.charts.noScores} />;

  // The axis is labelled here rather than in the service, so the month names
  // follow the reader's language without a second round trip.
  const points = data.map((point) => ({ ...point, label: fmt.shortMonthName(point.month) }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.grid }}
            content={({ active, label, payload }) => (
              <ChartTooltip
                active={active}
                label={label}
                payload={payload}
                formatter={(value) => value.toFixed(2)}
                unit=" / 10"
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="average"
            stroke="none"
            fill={CHART_COLORS.wash}
            fillOpacity={0.1}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke={CHART_COLORS.mark}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            dot={{
              r: 4,
              fill: CHART_COLORS.mark,
              stroke: CHART_COLORS.surface,
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: CHART_COLORS.mark,
              stroke: CHART_COLORS.surface,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
