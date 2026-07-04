"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast/ToastProvider";

type Comment = { id: string; body: string; createdAt: string; authorName: string };

function renderBody(body: string) {
  return body.split(/(@[\p{L}\w.]+)/u).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-accent">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function LibraryComments({ itemId, initialComments }: { itemId: string; initialComments: Comment[] }) {
  const { toast } = useToast();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function add() {
    if (!body.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/library/${itemId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setPosting(false);
    if (res.ok) {
      const d = await res.json();
      setComments((c) => [...c, { id: d.comment.id, body: d.comment.body, createdAt: d.comment.createdAt, authorName: d.comment.author.name }]);
      setBody("");
      toast("Đã gửi bình luận");
    } else {
      toast("Gửi bình luận thất bại", "error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 && <p className="text-sm text-[var(--text-muted)]">Chưa có bình luận.</p>}
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-[var(--border)] px-3 py-2 transition-all duration-150 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]">
          <div className="mb-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">{c.authorName}</span>
            <span>{formatRelativeTime(c.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{renderBody(c.body)}</p>
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Trao đổi… dùng @tên để nhắc ai đó"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          disabled={posting || !body.trim()}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)] active:scale-95 disabled:opacity-60"
        >
          {posting ? "Đang gửi..." : "Gửi"}
        </button>
      </div>
    </div>
  );
}
