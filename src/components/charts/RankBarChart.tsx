"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { CHART_INK, colorForIndex } from "@/lib/chart-colors";
import { formatNumber, formatUsd, formatDuration } from "@/lib/format";

// Server Components can't pass function props into a "use client" component,
// so the caller picks a format by name and the formatter is resolved here.
const FORMATTERS = { number: formatNumber, usd: formatUsd, duration: formatDuration } as const;

export function RankBarChart({
  data,
  valueFormat,
  height,
}: {
  data: { label: string; value: number }[];
  valueFormat: keyof typeof FORMATTERS;
  height?: number;
}) {
  const valueFormatter = FORMATTERS[valueFormat];
  const h = height ?? Math.max(180, data.length * 34);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-[var(--text-muted)]" style={{ height: h }}>
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 12, fill: CHART_INK.primary }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [valueFormatter(Number(value)), ""]}
          contentStyle={{
            background: CHART_INK.surface,
            border: `1px solid ${CHART_INK.gridline}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={18}
          label={{ position: "right", formatter: (label: unknown) => valueFormatter(Number(label)), fontSize: 11, fill: CHART_INK.secondary }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colorForIndex(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
