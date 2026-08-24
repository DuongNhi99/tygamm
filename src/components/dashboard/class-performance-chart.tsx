"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, CHART_COLORS, ChartEmpty, ChartTooltip } from "./chart-parts";
import { useDict } from "@/lib/i18n/client";
import type { ClassPerformancePoint } from "@/services/dashboard.service";

/**
 * Average score per class this month. Horizontal so long class names stay
 * readable; bars are capped at 24px with a 4px rounded data-end and a square
 * baseline, and the value rides the tip so no gridline is needed for it.
 */
export function ClassPerformanceChart({ data }: { data: ClassPerformancePoint[] }) {
  const dict = useDict();
  if (data.length === 0) return <ChartEmpty message={dict.charts.noClassAverages} />;

  return (
    <div style={{ height: Math.max(180, data.length * 44 + 32) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 36, bottom: 4, left: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
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
          <Bar
            dataKey="average"
            fill={CHART_COLORS.mark}
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="average"
              position="right"
              offset={8}
              className="fill-ink-muted text-xs tabular-nums"
              formatter={(value: unknown) => Number(value).toFixed(1)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
