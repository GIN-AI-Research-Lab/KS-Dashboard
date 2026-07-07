"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useT } from "@/i18n/I18nProvider";

export function UserNoteEditor({ userId, initialNote }: { userId: string; initialNote: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useT();
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      toast(t("ui.noteSaved"));
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast(t("ui.noteSaveFailed"), "error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder={t("ui.notePlaceholder")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-all duration-150 hover:bg-[var(--accent-hover)] active:scale-95 disabled:opacity-60"
        >
          {saving ? t("ui.saving") : t("ui.saveNote")}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--status-good)]">
            <Check className="h-4 w-4" aria-hidden />
            {t("ui.saved")}
          </span>
        )}
      </div>
    </div>
  );
}
