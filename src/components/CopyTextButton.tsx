"use client";

import { useState } from "react";

export function CopyTextButton({ text, label = "Chép" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
    >
      {copied ? "Đã chép ✓" : label}
    </button>
  );
}
