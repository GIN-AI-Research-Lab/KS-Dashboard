"use client";

import { Sankey, Tooltip, ResponsiveContainer, Rectangle } from "recharts";
import { CHART_INK } from "@/lib/chart-colors";
import { useT } from "@/i18n/I18nProvider";

type NodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { name: string };
};

function SankeyNode({ x = 0, y = 0, width = 0, height = 0, payload }: NodeProps) {
  const name = payload?.name ?? "";
  const isTarget = name.startsWith("→");
  const clean = name.replace(/→/g, "").trim();
  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill="var(--accent)" fillOpacity={0.85} />
      <text
        x={isTarget ? x + width + 6 : x - 6}
        y={y + height / 2}
        textAnchor={isTarget ? "start" : "end"}
        dominantBaseline="middle"
        fontSize={11}
        fill={CHART_INK.secondary}
      >
        {clean}
      </text>
    </g>
  );
}

export function ToolSankey({
  nodes,
  links,
}: {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}) {
  const t = useT();
  if (links.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-[var(--text-muted)]">
        {t("ui.noSankeyData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, nodes.length * 22)}>
      <Sankey
        data={{ nodes, links }}
        node={<SankeyNode />}
        nodePadding={16}
        nodeWidth={10}
        linkCurvature={0.5}
        link={{ stroke: "var(--accent)", strokeOpacity: 0.12 }}
        margin={{ left: 70, right: 70, top: 8, bottom: 8 }}
      >
        <Tooltip
          contentStyle={{
            background: CHART_INK.surface,
            border: `1px solid ${CHART_INK.gridline}`,
            borderRadius: 12,
            fontSize: 12,
            color: CHART_INK.primary,
            boxShadow: "var(--shadow-md)",
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}
