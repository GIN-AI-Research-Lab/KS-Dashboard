"use client";

import dynamic from "next/dynamic";

// Client-side lazy wrappers for the heavy Recharts charts. ssr:false defers the
// Recharts bundle past the initial server render/hydration (measured: ~336KB
// chunks), so pages paint first and charts stream in with a skeleton. Allowed
// here because this is a Client Component module.
function chartFallback(height: number) {
  const Fallback = () => <div className="skeleton rounded-xl" style={{ height }} />;
  return Fallback;
}

export const TrendChart = dynamic(
  () => import("./TrendChart").then((m) => ({ default: m.TrendChart })),
  { ssr: false, loading: chartFallback(260) }
);

export const ModelDonut = dynamic(
  () => import("./ModelDonut").then((m) => ({ default: m.ModelDonut })),
  { ssr: false, loading: chartFallback(260) }
);

export const RankBarChart = dynamic(
  () => import("./RankBarChart").then((m) => ({ default: m.RankBarChart })),
  { ssr: false, loading: chartFallback(200) }
);
