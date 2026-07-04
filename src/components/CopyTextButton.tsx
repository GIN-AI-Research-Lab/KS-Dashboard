"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyTextButton({ text, label = "Chép" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
        copied
          ? "border-accent bg-accent/10 text-accent"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-accent hover:text-accent hover:bg-accent/10"
      }`}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Đã chép" : label}
    </button>
  );
}
