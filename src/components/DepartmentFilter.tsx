"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

// URL-driven department picker (same push pattern as MetricTabs/RangeSelector).
// Selecting "all" drops the param; other values set ?department=<id>.
export function DepartmentFilter({
  label,
  options,
  allLabel,
}: {
  label: string;
  options: { id: string; name: string }[];
  allLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("department") ?? "all";

  function set(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("department");
    else next.set("department", value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <select
        value={current}
        onChange={(e) => set(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
