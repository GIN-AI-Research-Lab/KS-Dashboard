import { ReactNode } from "react";

// Each variant is an intentional tinted pill: a soft status/accent-tinted
// background, a matching-but-legible text ink, and a faint inset ring
// (ring-current below). Status tokens have no dark-theme override, so the text
// ink is tuned per-mode — a darker shade on the light tint for AA contrast, a
// brighter shade on the dark tint so it stays readable.
const VARIANTS: Record<string, string> = {
  neutral: "bg-black/5 text-[var(--text-secondary)] dark:bg-white/10",
  good: "bg-[var(--status-good)]/10 text-[#0a7d0a] dark:text-[#4cd07a]",
  warning: "bg-[var(--status-warning)]/15 text-[#8a6100] dark:text-[#f4c65a]",
  serious: "bg-[var(--status-serious)]/15 text-[#a3441f] dark:text-[#f0a07f]",
  critical: "bg-[var(--status-critical)]/10 text-[#b53030] dark:text-[#f07a7a]",
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
