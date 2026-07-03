"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserNoteEditor({ userId, initialNote }: { userId: string; initialNote: string | null }) {
  const router = useRouter();
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
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Ghi chú nội bộ về nhân viên này (vd: đang nghỉ phép, mới vào, phụ trách dự án X)…"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="self-start rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2368bd] disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu ghi chú"}
        </button>
        {saved && <span className="text-sm text-[#0ca30c]">Đã lưu ✓</span>}
      </div>
    </div>
  );
}
