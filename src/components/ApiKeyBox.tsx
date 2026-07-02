"use client";

import { useState } from "react";

export function ApiKeyBox({ initialKey }: { initialKey: string }) {
  const [apiKey, setApiKey] = useState(initialKey);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function regenerate() {
    if (!confirm("Tạo API key mới? Key cũ sẽ ngừng hoạt động và plugin cần cập nhật lại.")) return;
    setLoading(true);
    const res = await fetch("/api/me/regenerate-key", { method: "POST" });
    const data = await res.json();
    setApiKey(data.apiKey);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-[var(--border)] bg-black/[0.03] px-3 py-2 text-xs dark:bg-white/5">
          {apiKey}
        </code>
        <button
          onClick={copy}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          {copied ? "Đã chép" : "Chép"}
        </button>
      </div>
      <button
        onClick={regenerate}
        disabled={loading}
        className="self-start text-xs font-medium text-[#e34948] hover:underline disabled:opacity-60"
      >
        {loading ? "Đang tạo..." : "Tạo lại API key"}
      </button>
    </div>
  );
}
