"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS: { key: string; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "90d", label: "90 ngày" },
  { key: "all", label: "Tất cả" },
];

export function RangeSelector({ defaultRange = "30d" }: { defaultRange?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("range") ?? defaultRange;

  function setRange(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setRange(opt.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            current === opt.key
              ? "bg-[var(--text-primary)] text-[var(--surface)]"
              : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
