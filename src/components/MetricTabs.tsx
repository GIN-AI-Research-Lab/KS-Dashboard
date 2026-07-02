"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function MetricTabs({
  options,
  paramName = "metric",
  defaultValue,
}: {
  options: { key: string; label: string }[];
  paramName?: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramName) ?? defaultValue;

  function setValue(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set(paramName, key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setValue(opt.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            current === opt.key
              ? "bg-[#2a78d6] text-white"
              : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
