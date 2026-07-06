"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useT } from "@/i18n/I18nProvider";

// Copies the current URL (including active filters in the query string) so a
// filtered dashboard view can be shared with a teammate.
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const t = useT();
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast(t("chrome.copyLinkToast"));
        setTimeout(() => setCopied(false), 1500);
      }}
      title={t("chrome.copyLinkTitle")}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-150 active:scale-95 ${
        copied
          ? "border-accent bg-accent/10 text-accent"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-accent hover:text-accent hover:bg-accent/10"
      }`}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? t("chrome.copyLinkDone") : t("chrome.copyLink")}
    </button>
  );
}
