"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const controlCls =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none";

export function LiveFilters({ departments }: { departments: { id: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  function pushParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // Debounce the free-text search so we don't push a URL on every keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) pushParams({ q: q || undefined });
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const department = params.get("department") ?? "all";
  const status = params.get("status") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("live.searchPlaceholder")}
          className={`${controlCls} w-full pl-8`}
        />
      </div>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
        {t("live.department")}
        <select value={department} onChange={(e) => pushParams({ department: e.target.value })} className={controlCls}>
          <option value="all">{t("live.statusAll")}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
        {t("live.status")}
        <select value={status} onChange={(e) => pushParams({ status: e.target.value })} className={controlCls}>
          <option value="all">{t("live.statusAll")}</option>
          <option value="online">{t("live.statusOnline")}</option>
          <option value="ended">{t("live.statusEnded")}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
        {t("live.from")}
        <input type="date" value={from} onChange={(e) => pushParams({ from: e.target.value })} className={controlCls} />
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
        {t("live.to")}
        <input type="date" value={to} onChange={(e) => pushParams({ to: e.target.value })} className={controlCls} />
      </label>
    </div>
  );
}
