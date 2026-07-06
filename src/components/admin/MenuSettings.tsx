"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Eye, EyeOff, Save, RotateCcw, Lock } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useT } from "@/i18n/I18nProvider";

export type MenuSettingRow = {
  key: string;
  labelKey: string;
  href: string;
  visible: boolean;
  restricted: boolean; // has a role baseline (not visible to everyone)
  alwaysAccessible: boolean; // reachable by URL even when hidden (e.g. profile)
};

export function MenuSettings({
  initialItems,
  defaultItems,
}: {
  initialItems: MenuSettingRow[];
  defaultItems: MenuSettingRow[];
}) {
  const t = useT();
  const { toast } = useToast();
  const router = useRouter();
  // Local state is authoritative while editing; we deliberately do NOT re-sync
  // from props, so the layout's ~5s AutoRefresh can't clobber in-progress edits.
  const [rows, setRows] = useState<MenuSettingRow[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function move(from: number, to: number) {
    setRows((list) => {
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function toggle(key: string) {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, visible: !r.visible } : r)));
  }

  async function save() {
    setSaving(true);
    try {
      const items = rows.map((r, idx) => ({ key: r.key, visible: r.visible, sortOrder: idx }));
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      toast(t("settings.savedToast"), "success");
      router.refresh();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/menu", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows(defaultItems);
      toast(t("settings.savedToast"), "success");
      router.refresh();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-[13px] text-[var(--text-secondary)]">{t("settings.description")}</p>
      <p className="mb-4 flex items-start gap-1.5 text-[12px] text-[var(--text-muted)]">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("settings.privateNote")}
      </p>

      <ul className="flex flex-col gap-1.5">
        {rows.map((row, i) => {
          const label = t(row.labelKey);
          return (
            <li
              key={row.key}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOver !== i) setDragOver(i);
              }}
              onDrop={() => {
                if (dragIndex.current !== null) move(dragIndex.current, i);
                dragIndex.current = null;
                setDragOver(null);
              }}
              onDragEnd={() => {
                dragIndex.current = null;
                setDragOver(null);
              }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                dragOver === i ? "border-[var(--accent)] bg-[var(--accent-weak)]" : "border-[var(--border)]"
              } ${row.visible ? "" : "opacity-60"}`}
            >
              <button
                type="button"
                aria-label={t("settings.dragHint")}
                title={t("settings.dragHint")}
                className="cursor-grab text-[var(--text-muted)] active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                {label}
                <span className="ml-2 font-mono text-[11px] font-normal text-[var(--text-muted)]">{row.href}</span>
              </span>

              {row.restricted && (
                <span
                  title={t("settings.roleRestricted")}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
                >
                  <Lock className="h-3 w-3" /> {t("settings.roleRestricted")}
                </span>
              )}

              <button
                type="button"
                onClick={() => toggle(row.key)}
                aria-pressed={row.visible}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  row.visible
                    ? "bg-[var(--accent-weak)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]"
                }`}
              >
                {row.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {row.visible ? t("settings.show") : t("settings.hide")}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? t("common.saving") : t("settings.save")}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-black/[0.04] hover:text-[var(--text-primary)] disabled:opacity-50 dark:hover:bg-white/[0.06]"
        >
          <RotateCcw className="h-4 w-4" />
          {t("settings.resetDefaults")}
        </button>
      </div>
    </div>
  );
}
