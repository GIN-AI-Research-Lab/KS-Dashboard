import { CSSProperties, ReactNode } from "react";

/**
 * Skeleton — a subtle, theme-aware shimmer placeholder block.
 * Pure server markup: no client JS. The shimmer + reduced-motion fallback
 * live in globals.css under the `.skeleton` class.
 */
export function Skeleton({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={`skeleton rounded-lg ${className}`} style={style} aria-hidden="true">
      {children}
    </div>
  );
}

/**
 * SkeletonLine — a single text-line placeholder. `w` controls width
 * (e.g. "60%", "8rem"); defaults to full width.
 */
export function SkeletonLine({
  className = "",
  w,
}: {
  className?: string;
  w?: string;
}) {
  return <Skeleton className={`h-3 rounded-md ${className}`} style={w ? { width: w } : undefined} />;
}
