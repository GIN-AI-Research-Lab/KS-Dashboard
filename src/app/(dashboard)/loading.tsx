import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

// Server component (no "use client"): renders during route data fetch /
// streaming. Mirrors the common dashboard layout — hero panel, a row of
// stat cards, then two chart cards.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {/* hero-panel-sized header */}
      <Skeleton className="h-24 rounded-2xl p-5">
        <div className="flex h-full flex-col justify-center gap-3">
          <SkeletonLine className="h-4" w="40%" />
          <SkeletonLine w="24%" />
        </div>
      </Skeleton>

      {/* stat-card row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-24 flex-col justify-center gap-3 rounded-2xl border border-[var(--border)] p-4"
          >
            <SkeletonLine w="55%" />
            <SkeletonLine className="h-5" w="70%" />
          </div>
        ))}
      </div>

      {/* chart cards */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] p-5 xl:col-span-2">
          <SkeletonLine className="mb-4" w="30%" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
        <div className="rounded-2xl border border-[var(--border)] p-5">
          <SkeletonLine className="mb-4" w="45%" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
