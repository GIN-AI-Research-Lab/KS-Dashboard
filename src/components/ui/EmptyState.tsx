import { ReactNode, CSSProperties } from "react";

/**
 * EmptyState — centered, composed placeholder for "no data" surfaces.
 * A lucide icon in a tinted circle, a title, an optional hint, and an
 * optional action node. Token-based and theme-aware. Not wired into pages.
 */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  accent,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  accent?: string;
  className?: string;
}) {
  const tint = accent ?? "var(--accent)";
  const iconStyle = accent
    ? ({
        background: `color-mix(in srgb, ${tint} 12%, transparent)`,
        color: tint,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            accent ? "" : "bg-accent/10 text-accent"
          }`}
          style={iconStyle}
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
