"use client";

import { ReactNode, CSSProperties } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";
import { InfoTip } from "./InfoTip";
import { useT } from "@/i18n/I18nProvider";

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
  deltaPct,
  rawValue,
  format,
  spark,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
  deltaPct?: number | null;
  rawValue?: number;
  format?: "number" | "usd" | "percent";
  spark?: number[];
  tooltip?: string;
}) {
  const t = useT();
  const hasDelta = typeof deltaPct === "number" && isFinite(deltaPct);
  const up = hasDelta && (deltaPct as number) >= 0;
  const tint = accent ?? "var(--accent)";
  const animate = typeof rawValue === "number" && isFinite(rawValue) && !!format;
  const hasSpark = Array.isArray(spark) && spark.length > 1;

  const style = {
    "--tint": tint,
    background: `linear-gradient(165deg, color-mix(in srgb, ${tint} 9%, var(--surface)) 0%, var(--surface) 58%)`,
  } as CSSProperties;

  return (
    <div
      className="stat-card rounded-2xl border border-[var(--border)] p-4 shadow-[var(--shadow-xs)]"
      style={style}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
          {tooltip && <InfoTip label={tooltip} />}
        </span>
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 text-[1.7rem] font-semibold leading-none tracking-tight tabular-nums text-[var(--text-primary)]">
        {animate ? (
          <CountUp value={rawValue as number} format={format as "number" | "usd" | "percent"} />
        ) : (
          value
        )}
      </div>
      {hasDelta && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums ${
              up ? "bg-[#0ca30c]/10 text-[#0ca30c]" : "bg-[#e34948]/10 text-[#e34948]"
            }`}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(deltaPct as number).toFixed(1)}%
          </span>
          <span className="text-[var(--text-muted)]">{t("ui.vsPrevious")}</span>
        </div>
      )}
      {hint && <div className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">{hint}</div>}
      {hasSpark && <Sparkline data={spark as number[]} color={tint} className="mt-3" />}
    </div>
  );
}
