"use client";

import { useEffect, useRef } from "react";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";

type Format = "number" | "usd" | "percent";

function formatBy(format: Format, n: number): string {
  switch (format) {
    case "usd":
      return formatUsd(n);
    case "percent":
      return formatPercent(n);
    case "number":
    default:
      return formatNumber(n);
  }
}

export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: Format;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // Respect reduced motion: leave the final (already rendered) value.
      return;
    }

    const duration = 800;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = value * eased;
      node.textContent = formatBy(format, current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        node.textContent = formatBy(format, value);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, format]);

  return (
    <span ref={ref} className={className}>
      {formatBy(format, value)}
    </span>
  );
}
