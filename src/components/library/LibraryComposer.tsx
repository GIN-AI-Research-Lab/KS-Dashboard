"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { MarkdownEditor } from "@/components/library/MarkdownEditor";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { slugifySkillName, isValidSkillName, SKILL_NAME_MAX } from "@/lib/library";
import { useT } from "@/i18n/I18nProvider";

export function LibraryComposer() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"PROMPT" | "SKILL">("PROMPT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillNameEdited, setSkillNameEdited] = useState(false);
  const [skillDescription, setSkillDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [saving, setSaving] = useState(false);

  const isSkill = kind === "SKILL";
  const skillNameValid = isValidSkillName(skillName.trim());
  const canSave =
    !!title.trim() &&
    !!body.trim() &&
    !saving &&
    (!isSkill || (skillNameValid && !!skillDescription.trim()));

  function onTitleChange(v: string) {
    setTitle(v);
    // Auto-derive the skill name from the title until the user edits it directly.
    if (!skillNameEdited) setSkillName(slugifySkillName(v));
  }

  function selectKind(k: "PROMPT" | "SKILL") {
    setKind(k);
    if (k === "SKILL" && !skillNameEdited && !skillName) setSkillName(slugifySkillName(title));
  }

  function reset() {
    setTitle("");
    setBody("");
    setTags("");
    setSkillName("");
    setSkillNameEdited(false);
    setSkillDescription("");
    setOpen(false);
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title,
        body,
        tags,
        visibility,
        ...(isSkill ? { skillName: skillName.trim(), skillDescription: skillDescription.trim() } : {}),
      }),
    });
    setSaving(false);
    if (res.ok) {
      reset();
      toast(t("library.postedToast"));
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast(data?.error || t("library.postFailedToast"), "error");
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-colors duration-150 hover:bg-accent-hover active:scale-[0.98]">
        <Plus className="h-4 w-4" />
        {t("library.postButton")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["PROMPT", "SKILL"] as const).map((k) => (
          <button
            key={k}
            onClick={() => selectKind(k)}
            className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors duration-150 ${kind === k ? "border-accent bg-accent/10 text-accent" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"}`}
          >
            {k === "PROMPT" ? "Prompt" : "Skill"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {(["PUBLIC", "PRIVATE"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors duration-150 ${visibility === v ? "border-accent bg-accent/10 text-accent" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"}`}
            >
              {v === "PUBLIC" ? t("library.public") : t("library.private")}
            </button>
          ))}
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={t("library.titlePlaceholder")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />

      {isSkill && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2,transparent)] p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              {t("library.skillNameLabel")} <span className="text-[var(--text-muted)]">{t("library.skillNameHint")}</span>
            </label>
            <input
              value={skillName}
              onChange={(e) => {
                setSkillNameEdited(true);
                setSkillName(e.target.value);
              }}
              placeholder="vi-du-ten-skill"
              maxLength={SKILL_NAME_MAX}
              spellCheck={false}
              className={`w-full rounded-lg border bg-[var(--surface)] px-3 py-2 font-mono text-sm ${skillName && !skillNameValid ? "border-red-500/70" : "border-[var(--border)]"}`}
            />
            <p className={`mt-1 text-[11px] ${skillName && !skillNameValid ? "text-red-500" : "text-[var(--text-muted)]"}`}>
              {skillName && !skillNameValid
                ? t("library.skillNameInvalid")
                : t("library.skillNameUnique")}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              {t("library.skillDescLabel")} <span className="text-[var(--text-muted)]">{t("library.skillDescHint")}</span>
            </label>
            <input
              value={skillDescription}
              onChange={(e) => setSkillDescription(e.target.value)}
              placeholder={t("library.skillDescPlaceholder")}
              maxLength={300}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <MarkdownEditor
        value={body}
        onChange={setBody}
        placeholder={kind === "PROMPT" ? t("library.promptBodyPlaceholder") : t("library.skillBodyPlaceholder")}
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder={t("library.tagsPlaceholder")}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={!canSave}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-colors duration-150 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? t("library.posting") : t("library.post")}
        </button>
        <button onClick={reset} className="text-sm text-[var(--text-muted)] hover:underline">
          {t("library.cancel")}
        </button>
      </div>
    </div>
  );
}
