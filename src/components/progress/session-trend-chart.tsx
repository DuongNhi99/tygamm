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
import { AXIS_TICK, CHART_COLORS, ChartEmpty, ChartTooltip } from "@/components/dashboard/chart-parts";
import { useDict } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";

export interface SessionPoint {
  session: number;
  score: number | null;
}

/**
 * Score across the sessions of one month — the §23 progress chart. One
 * series, so no legend; the card title says whose scores these are.
 */
export function SessionTrendChart({ data, label }: { data: SessionPoint[]; label?: string }) {
  const dict = useDict();
  const seriesName = label ?? dict.charts.score;

  if (!data.some((point) => point.score !== null)) {
    return <ChartEmpty message={dict.charts.noScoresThisMonth} />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="session"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickFormatter={(value: number) => String(value)}
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
            content={({ active, label: tooltipLabel, payload }) => (
              <ChartTooltip
                active={active}
                label={interpolate(dict.charts.session, { number: String(tooltipLabel) })}
                payload={payload}
                formatter={(value) => value.toFixed(2)}
                unit=" / 10"
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="none"
            fill={CHART_COLORS.wash}
            fillOpacity={0.1}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="score"
            name={seriesName}
            stroke={CHART_COLORS.mark}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            dot={{ r: 4, fill: CHART_COLORS.mark, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART_COLORS.mark, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
