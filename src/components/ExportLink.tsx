"use client";

import { Download } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

// Download link to an /api/export/* route that streams a CSV with
// Content-Disposition: attachment, so a plain anchor triggers the download while
// carrying the session cookie.
export function ExportLink({ href, label }: { href: string; label?: string }) {
  const t = useT();
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-all duration-150 hover:border-accent hover:text-accent hover:bg-accent/10"
    >
      <Download className="h-4 w-4" aria-hidden />
      {label ?? t("ui.exportCsv")}
    </a>
  );
}
