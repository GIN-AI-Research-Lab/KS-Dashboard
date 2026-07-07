"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { CHART_INK, themedSeries } from "@/lib/chart-colors";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatDay, formatNumber, formatUsd } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendAnnotation {
  date: string;
  label: string;
}

// Server Components can't pass function props into a "use client" component
// (they aren't serializable across the RSC boundary) -- so the caller picks a
// format by name and the formatter itself is resolved here, client-side.
const FORMATTERS = { number: formatNumber, usd: formatUsd } as const;

export function TrendChart({
  data,
  series,
  valueFormat = "number",
  height = 260,
  annotations,
}: {
  data: Record<string, number | string>[];
  series: TrendSeries[];
  valueFormat?: keyof typeof FORMATTERS;
  height?: number;
  annotations?: TrendAnnotation[];
}) {
  const t = useT();
  const valueFormatter = FORMATTERS[valueFormat];
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        {t("table.noData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={themedSeries(s.color)} stopOpacity={0.26} />
              <stop offset="95%" stopColor={themedSeries(s.color)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_INK.gridline} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDay(v)}
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={{ stroke: CHART_INK.baseline }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => valueFormatter(v)}
          tick={{ fontSize: 11, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: CHART_INK.baseline, strokeWidth: 1, strokeDasharray: "3 3" }}
          content={
            <ChartTooltip
              labelFormatter={(v) => formatDay(String(v))}
              valueFormatter={(n) => valueFormatter(n)}
              hideName={series.length === 1}
            />
          }
        />
        {series.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span style={{ color: CHART_INK.secondary }}>{value}</span>
            )}
          />
        )}
        {annotations?.map((a) => (
          <ReferenceLine
            key={a.date}
            x={a.date}
            stroke={CHART_INK.muted}
            strokeDasharray="4 3"
            label={{ value: a.label, fontSize: 10, fill: CHART_INK.secondary, position: "top" }}
          />
        ))}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={themedSeries(s.color)}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: CHART_INK.surface }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
