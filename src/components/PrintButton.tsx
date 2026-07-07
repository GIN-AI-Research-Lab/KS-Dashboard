"use client";

import { Printer } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function PrintButton({ label }: { label?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
    >
      <Printer className="h-4 w-4" />
      {label ?? t("ui.print")}
    </button>
  );
}
