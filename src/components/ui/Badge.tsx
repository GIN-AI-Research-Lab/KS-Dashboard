import { ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  neutral: "bg-black/5 text-[var(--text-secondary)] dark:bg-white/10",
  good: "bg-[var(--status-good)]/10 text-[var(--status-good)]",
  warning: "bg-[var(--status-warning)]/15 text-[#8a6100]",
  serious: "bg-[var(--status-serious)]/15 text-[#a3441f]",
  critical: "bg-[var(--status-critical)]/10 text-[var(--status-critical)]",
  info: "bg-accent/10 text-accent",
};

export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/15 transition-colors duration-150 ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}

export function Tag({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-tight"
      style={{
        borderColor: color ? `${color}55` : "var(--border)",
        color: color ?? "var(--text-secondary)",
        background: color ? `${color}12` : "transparent",
      }}
    >
      {children}
    </span>
  );
}
