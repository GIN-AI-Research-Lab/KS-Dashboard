"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Label } from "recharts";
import { colorForModel, CHART_INK } from "@/lib/chart-colors";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { formatNumber } from "@/lib/format";
import { useT } from "@/i18n/I18nProvider";

function DonutCenter({ viewBox, total }: { viewBox?: { cx?: number; cy?: number }; total: number }) {
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="20" fontWeight="600" fill="var(--text-primary)">
        {formatNumber(total)}
      </tspan>
      <tspan x={cx} dy="1.7em" fontSize="11" fill="var(--text-muted)">
        tokens
      </tspan>
    </text>
  );
}

export function ModelDonut({
  data,
  height = 260,
}: {
  data: { model: string; totalTokens: number }[];
  height?: number;
}) {
  const t = useT();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-[var(--text-muted)]" style={{ height }}>
        {t("common.noData")}
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.totalTokens, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalTokens"
          nameKey="model"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={2}
          stroke={CHART_INK.surface}
        >
          {data.map((d) => (
            <Cell key={d.model} fill={colorForModel(d.model)} />
          ))}
          <Label content={<DonutCenter total={total} />} />
        </Pie>
        <Tooltip content={<ChartTooltip valueFormatter={(n) => formatNumber(n) + " tokens"} />} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, lineHeight: "20px" }}
          formatter={(value) => <span style={{ color: CHART_INK.secondary }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
