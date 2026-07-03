"use client";

import { useState } from "react";
import { REACTIONS } from "@/lib/library";

export function LibraryReactions({
  itemId,
  initialCounts,
  initialMine,
}: {
  itemId: string;
  initialCounts: { emoji: string; count: number }[];
  initialMine: string[];
}) {
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(initialCounts.map((c) => [c.emoji, c.count])),
  );
  const [mine, setMine] = useState<string[]>(initialMine);

  async function react(emoji: string) {
    const res = await fetch(`/api/library/${itemId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const d = await res.json();
      setCounts(Object.fromEntries(d.reactionCounts.map((c: { emoji: string; count: number }) => [c.emoji, c.count])));
      setMine(d.myReactions);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm ${
              active ? "border-[#2a78d6] bg-[#2a78d6]/10" : "border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs tabular-nums text-[var(--text-secondary)]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
