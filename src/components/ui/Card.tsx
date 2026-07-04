import { CSSProperties, ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = "",
  tone,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: string;
}) {
  // Optional category accent: a subtle colored left bar so cards can be grouped
  // by department/team/etc. Overrides only the left border, leaving the card's
  // box-shadow (and hover shadow) untouched.
  const toneStyle: CSSProperties | undefined = tone
    ? { borderLeftColor: tone, borderLeftWidth: "3px" }
    : undefined;
  return (
    <section
      style={toneStyle}
      className={`card-surface rounded-2xl border border-[var(--border)] p-5 shadow-[var(--shadow-xs)] transition-shadow duration-200 hover:shadow-[var(--shadow-sm)] ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
