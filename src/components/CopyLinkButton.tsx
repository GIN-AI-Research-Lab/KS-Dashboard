"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
        copied
          ? "border-accent bg-accent/10 text-accent"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-accent hover:text-accent hover:bg-accent/10"
      }`}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Đã chép link" : "Chép link"}
    </button>
  );
}
