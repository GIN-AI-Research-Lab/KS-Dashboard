"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${visibility === v ? "bg-[var(--text-primary)] text-[var(--surface)]" : "text-[var(--text-secondary)]"}`}
          >
            {v === "PUBLIC" ? "Công khai" : "Riêng tư"}
          </button>
        ))}
      </div>
      <button onClick={remove} disabled={busy} className="text-xs font-medium text-[#e34948] hover:underline disabled:opacity-60">
        Xoá
      </button>
    </div>
  );
}
