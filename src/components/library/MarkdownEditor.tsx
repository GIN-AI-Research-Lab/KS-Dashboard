"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useT } from "@/i18n/I18nProvider";

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const ref = useRef<HTMLTextAreaElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const mdInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  function insert(before: string, after = "", placeholderText = "") {
    const el = ref.current;
    if (!el) {
      onChange(value + before + placeholderText + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const d = await res.json();
      onChange(`${value}${value.endsWith("\n") || value === "" ? "" : "\n"}![${t("library.editorSampleImageAlt")}](${d.url})\n`);
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? t("library.editorUploadFailed"), "error");
    }
  }

  async function importMd(file: File) {
    const text = await file.text();
    onChange(value ? `${value}\n\n${text}` : text);
  }

  const btn = "rounded border border-[var(--border)] px-2 py-1 text-xs font-medium transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-black/5 active:scale-[0.98] dark:hover:bg-white/10";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={() => insert("## ", "", t("library.editorSampleHeading"))}>H2</button>
        <button type="button" className={btn} onClick={() => insert("**", "**", t("library.editorSampleBold"))}>B</button>
        <button type="button" className={btn} onClick={() => insert("*", "*", t("library.editorSampleItalic"))}>i</button>
        <button type="button" className={btn} onClick={() => insert("`", "`", t("library.editorSampleCode"))}>{"</>"}</button>
        <button type="button" className={btn} onClick={() => insert("```\n", "\n```", t("library.editorSampleCodeBlock"))}>{t("library.editorCodeBlockBtn")}</button>
        <button type="button" className={btn} onClick={() => insert("- ", "", t("library.editorSampleListItem"))}>{t("library.editorListBtn")}</button>
        <button type="button" className={`${btn} inline-flex items-center gap-1`} onClick={() => imgInput.current?.click()} disabled={uploading}>
          <ImageIcon className="h-4 w-4" />
          {uploading ? t("library.editorUploading") : t("library.editorImageBtn")}
        </button>
        <button type="button" className={btn} onClick={() => mdInput.current?.click()}>{t("library.editorImportMdBtn")}</button>
        <button type="button" className={`${btn} ml-auto ${preview ? "border-accent bg-accent/10 text-accent" : ""}`} onClick={() => setPreview((p) => !p)}>
          {preview ? t("library.editorEditBtn") : t("library.editorPreviewBtn")}
        </button>
        <input
          ref={imgInput}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            e.target.value = "";
          }}
        />
        <input
          ref={mdInput}
          type="file"
          accept=".md,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importMd(f);
            e.target.value = "";
          }}
        />
      </div>

      {preview ? (
        <div className="min-h-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          {value.trim() ? renderMarkdown(value) : <span className="text-sm text-[var(--text-muted)]">{t("library.editorNoContent")}</span>}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder={placeholder ?? t("library.editorDefaultPlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm"
        />
      )}
    </div>
  );
}
