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
import { CHART_INK } from "@/lib/chart-colors";
import { formatDay, formatNumber, formatUsd } from "@/lib/format";

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
  const valueFormatter = FORMATTERS[valueFormat];
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        Chưa có dữ liệu trong khoảng thời gian này
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
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
          formatter={(value, name) => [valueFormatter(Number(value)), String(name)]}
          labelFormatter={(v) => formatDay(String(v))}
          contentStyle={{
            background: CHART_INK.surface,
            border: `1px solid ${CHART_INK.gridline}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
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
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
