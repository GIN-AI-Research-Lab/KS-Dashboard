"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useT } from "@/i18n/I18nProvider";

export function LibraryStar({
  itemId,
  initialBookmarked,
  initialCount,
}: {
  itemId: string;
  initialBookmarked: boolean;
  initialCount: number;
}) {
  const t = useT();
  const { toast } = useToast();
  const [on, setOn] = useState(initialBookmarked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/library/${itemId}/bookmark`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setOn(d.bookmarked);
      setCount(d.count);
      toast(d.bookmarked ? t("library.savedToast") : t("library.unsavedToast"));
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={on ? t("library.unstar") : t("library.star")}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-60 ${
        on ? "border-[#eda100] bg-[#eda100]/10 text-[#8a6100]" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      <Star className={`h-4 w-4 transition-colors duration-150 ${on ? "fill-[#eda100] text-[#eda100]" : "text-current"}`} />
      {count}
    </button>
  );
}
