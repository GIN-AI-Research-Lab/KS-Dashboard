"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function SignOutButton() {
  const t = useT();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-black/5 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {t("chrome.signOut")}
    </button>
  );
}
