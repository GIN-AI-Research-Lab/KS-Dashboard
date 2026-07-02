"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { colorForModel, CHART_INK } from "@/lib/chart-colors";
import { formatNumber } from "@/lib/format";

export function ModelDonut({
  data,
  height = 260,
}: {
  data: { model: string; totalTokens: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-[var(--text-muted)]" style={{ height }}>
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalTokens"
          nameKey="model"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={2}
          stroke={CHART_INK.surface}
        >
          {data.map((d) => (
            <Cell key={d.model} fill={colorForModel(d.model)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatNumber(Number(value)) + " tokens", String(name)]}
          contentStyle={{
            background: CHART_INK.surface,
            border: `1px solid ${CHART_INK.gridline}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, lineHeight: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
