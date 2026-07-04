"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Trash2 } from "lucide-react";

// Owner controls for a library item: toggle public/private and delete.
export function ItemManageBar({
  itemId,
  initialVisibility,
  redirectOnDelete,
}: {
  itemId: string;
  initialVisibility: "PUBLIC" | "PRIVATE";
  redirectOnDelete?: string;
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState(initialVisibility);
  const [busy, setBusy] = useState(false);

  async function setVis(v: "PUBLIC" | "PRIVATE") {
    if (v === visibility) return;
    setBusy(true);
    const res = await fetch(`/api/library/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: v }),
    });
    setBusy(false);
    if (res.ok) {
      setVisibility(v);
      router.refresh();
    }
  }

  async function remove() {
    if (!confirm("Xoá bài này?")) return;
    setBusy(true);
    const res = await fetch(`/api/library/${itemId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      if (redirectOnDelete) router.push(redirectOnDelete);
      else router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5">
        {(["PUBLIC", "PRIVATE"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVis(v)}
            disabled={busy}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-150 ${visibility === v ? "bg-accent/10 text-accent" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            {v === "PUBLIC" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {v === "PUBLIC" ? "Công khai" : "Riêng tư"}
          </button>
        ))}
      </div>
      <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-[#e34948] transition-colors duration-150 hover:bg-[#e34948]/10 disabled:opacity-60">
        <Trash2 className="h-4 w-4" />
        Xoá
      </button>
    </div>
  );
}
