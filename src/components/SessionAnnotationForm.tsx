"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Check } from "lucide-react";
import type { SessionOutcome } from "@prisma/client";
import { Badge, Tag } from "@/components/ui/Badge";
import { getOutcomeLabel, OUTCOME_VARIANT, parseTags } from "@/lib/session-outcome";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useT } from "@/i18n/I18nProvider";

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
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<SessionOutcome | "">(initialOutcome ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [tags, setTags] = useState(initialTags ?? "");
  const [featured, setFeatured] = useState(initialFeatured);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const OUTCOME_LABEL = getOutcomeLabel(t);

  if (!canEdit) {
    const tagList = parseTags(initialTags);
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          {initialOutcome ? (
            <Badge variant={OUTCOME_VARIANT[initialOutcome]}>{OUTCOME_LABEL[initialOutcome]}</Badge>
          ) : (
            <span className="text-[var(--text-muted)]">{t("sessionsPage.noOutcomeYet")}</span>
          )}
          {initialFeatured && (
            <Badge variant="info">
              <Star className="h-3.5 w-3.5 fill-current" /> {t("sessionsPage.featuredLabel")}
            </Badge>
          )}
        </div>
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{initialNote || t("sessionsPage.noNoteYet")}</p>
        <p className="text-xs text-[var(--text-muted)]">{t("sessionsPage.editPermissionHint")}</p>
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
      toast(t("sessionsPage.savedToast"));
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast(t("sessionsPage.saveFailedToast"), "error");
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
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
              outcome === o
                ? "border-accent bg-accent/10 text-accent"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-accent hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {OUTCOME_LABEL[o]}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        {t("sessionsPage.featuredCheckboxLabel")}
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{t("sessionsPage.tagsLabel")}</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={t("sessionsPage.tagsPlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{t("sessionsPage.noteLabel")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={t("sessionsPage.notePlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-all duration-150 hover:bg-accent-hover hover:shadow-[var(--shadow-sm)] active:scale-95 disabled:opacity-60 disabled:shadow-none"
        >
          {saving ? t("sessionsPage.saving") : t("sessionsPage.saveNoteButton")}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--status-good)]">
            <Check className="h-4 w-4" /> {t("sessionsPage.savedToast")}
          </span>
        )}
      </div>
    </div>
  );
}
