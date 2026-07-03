"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/library/MarkdownEditor";

export function LibraryComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"PROMPT" | "SKILL">("PROMPT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, body, tags, visibility }),
    });
    setSaving(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setTags("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="self-start rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2368bd]">
        + Đăng bài
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["PROMPT", "SKILL"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg border px-3 py-1 text-sm font-medium ${kind === k ? "border-[#2a78d6] bg-[#2a78d6]/10 text-[#2a78d6]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}
          >
            {k === "PROMPT" ? "Prompt" : "Skill"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {(["PUBLIC", "PRIVATE"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium ${visibility === v ? "border-[#2a78d6] bg-[#2a78d6]/10 text-[#2a78d6]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}
            >
              {v === "PUBLIC" ? "Công khai" : "Riêng tư"}
            </button>
          ))}
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <MarkdownEditor
        value={body}
        onChange={setBody}
        placeholder={kind === "PROMPT" ? "Nội dung prompt (Markdown, chèn ảnh được)…" : "Mô tả skill: cách dùng, khi nào dùng, ví dụ… (Markdown, chèn ảnh / nhập .md)"}
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (phân cách dấu phẩy)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !title.trim() || !body.trim()}
          className="rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2368bd] disabled:opacity-60"
        >
          {saving ? "Đang đăng..." : "Đăng"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-[var(--text-muted)] hover:underline">
          Huỷ
        </button>
      </div>
    </div>
  );
}
