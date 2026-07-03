"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/format";

type Comment = { id: string; body: string; createdAt: string; authorName: string };

function renderBody(body: string) {
  // Highlight @mentions (display only; notification delivery is future work).
  return body.split(/(@[\p{L}\w.]+)/u).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-[#2a78d6]">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function SessionDiscussion({
  sessionId,
  initialComments,
  initialUp,
  initialDown,
  initialMyVote,
}: {
  sessionId: string;
  initialComments: Comment[];
  initialUp: number;
  initialDown: number;
  initialMyVote: number;
}) {
  const [comments, setComments] = useState(initialComments);
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function vote(v: 1 | -1) {
    const next = myVote === v ? 0 : v;
    const res = await fetch(`/api/sessions/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next }),
    });
    if (res.ok) {
      const d = await res.json();
      setUp(d.up);
      setDown(d.down);
      setMyVote(next);
    }
  }

  async function addComment() {
    if (!body.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/sessions/${sessionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setPosting(false);
    if (res.ok) {
      const d = await res.json();
      setComments((c) => [...c, { id: d.comment.id, body: d.comment.body, createdAt: d.comment.createdAt, authorName: d.comment.author.name }]);
      setBody("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => vote(1)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            myVote === 1 ? "border-[#0ca30c] bg-[#0ca30c]/10 text-[#0ca30c]" : "border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          👍 {up}
        </button>
        <button
          onClick={() => vote(-1)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            myVote === -1 ? "border-[#e34948] bg-[#e34948]/10 text-[#e34948]" : "border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          👎 {down}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {comments.length === 0 && <p className="text-sm text-[var(--text-muted)]">Chưa có bình luận.</p>}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-[var(--border)] px-3 py-2">
            <div className="mb-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">{c.authorName}</span>
              <span>{formatRelativeTime(c.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{renderBody(c.body)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Viết bình luận… dùng @tên để nhắc ai đó"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button
          onClick={addComment}
          disabled={posting || !body.trim()}
          className="self-start rounded-lg bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2368bd] disabled:opacity-60"
        >
          {posting ? "Đang gửi..." : "Gửi bình luận"}
        </button>
      </div>
    </div>
  );
}
