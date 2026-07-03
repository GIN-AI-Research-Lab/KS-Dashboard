"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { OUTCOME_LABEL } from "@/lib/session-outcome";

const OUTCOME_OPTS = [
  { key: "", label: "Tất cả" },
  { key: "SOLVED", label: OUTCOME_LABEL.SOLVED },
  { key: "IN_PROGRESS", label: OUTCOME_LABEL.IN_PROGRESS },
  { key: "ABANDONED", label: OUTCOME_LABEL.ABANDONED },
];

export function SessionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const outcome = params.get("outcome") ?? "";
  const featured = params.get("featured") === "1";
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {OUTCOME_OPTS.map((o) => (
          <button
            key={o.key}
            onClick={() => update({ outcome: o.key || null })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              outcome === o.key
                ? "bg-[var(--text-primary)] text-[var(--surface)]"
                : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => update({ featured: featured ? null : "1" })}
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          featured
            ? "border-[#2a78d6] bg-[#2a78d6]/10 text-[#2a78d6]"
            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        ★ Nổi bật
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q || null });
        }}
        className="min-w-[180px] flex-1"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm ghi chú, tag, dự án, người… (Enter)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
        />
      </form>
    </div>
  );
}
