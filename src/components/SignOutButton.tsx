"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
    >
      Đăng xuất
    </button>
  );
}
