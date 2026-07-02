import { ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  neutral: "bg-black/5 text-[var(--text-secondary)] dark:bg-white/10",
  good: "bg-[#0ca30c]/10 text-[#0ca30c]",
  warning: "bg-[#fab219]/15 text-[#8a6100]",
  serious: "bg-[#ec835a]/15 text-[#a3441f]",
  critical: "bg-[#d03b3b]/10 text-[#d03b3b]",
  info: "bg-[#2a78d6]/10 text-[#2a78d6]",
};

export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
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
