"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionOutcome } from "@prisma/client";
import { Badge, Tag } from "@/components/ui/Badge";
import { OUTCOME_LABEL, OUTCOME_VARIANT, parseTags } from "@/lib/session-outcome";

type Props = {
  sessionId: string;
  canEdit: boolean;
  initialOutcome: SessionOutcome | null;
  initialNote: string | null;
  initialTags: string | null;
  initialFeatured: boolean;
};

const OUTCOMES: SessionOutcome[] = ["SOLVED", "IN_PROGRESS", "ABANDONED"];

export function SessionAnnotationForm({ sessionId, canEdit, initialOutcome, initialNote, initialTags, initialFeatured }: Props) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<SessionOutcome | "">(initialOutcome ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [tags, setTags] = useState(initialTags ?? "");
  const [featured, setFeatured] = useState(initialFeatured);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!canEdit) {
    const tagList = parseTags(initialTags);
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          {initialOutcome ? (
            <Badge variant={OUTCOME_VARIANT[initialOutcome]}>{OUTCOME_LABEL[initialOutcome]}</Badge>
          ) : (
            <span className="text-[var(--text-muted)]">Chưa gắn kết quả</span>
          )}
          {initialFeatured && <Badge variant="info">★ Nổi bật</Badge>}
        </div>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{initialNote || "Chưa có ghi chú."}</p>
        <p className="text-xs text-[var(--text-muted)]">Chỉ chủ phiên hoặc quản trị viên mới chỉnh sửa được.</p>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: outcome || null, note, tags, featured }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(outcome === o ? "" : o)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              outcome === o
                ? "border-[#2a78d6] bg-[#2a78d6]/10 text-[#2a78d6]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {OUTCOME_LABEL[o]}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Đưa vào thư viện phiên nổi bật (★)
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Tags (phân cách bằng dấu phẩy)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="vd: bugfix, deploy, refactor"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Ghi chú (đã xử lý được vấn đề gì?)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Mô tả ngắn cách phiên này giải quyết vấn đề, để người khác học lại…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2368bd] disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu ghi chú"}
        </button>
        {saved && <span className="text-sm text-[#0ca30c]">Đã lưu ✓</span>}
      </div>
    </div>
  );
}
