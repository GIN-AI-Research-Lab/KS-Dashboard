"use client";

import { useState } from "react";

// Copies the current URL (including active filters in the query string) so a
// filtered dashboard view can be shared with a teammate.
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Sao chép liên kết view hiện tại (kèm bộ lọc)"
      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
    >
      {copied ? "Đã chép link ✓" : "Chép link"}
    </button>
  );
}
