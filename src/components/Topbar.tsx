import { ROLE_LABELS } from "@/lib/access";
import type { Role } from "@prisma/client";
import { SignOutButton } from "@/components/SignOutButton";
import { SearchTrigger } from "@/components/SearchTrigger";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenuButton } from "@/components/sidebar/MobileMenuButton";
import Link from "next/link";

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <MobileMenuButton />
        <SearchTrigger />
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <CopyLinkButton />
        <Link
          href="/me"
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4a3aa7]/15 text-xs font-semibold text-[#4a3aa7]">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-right">
            <div className="text-xs font-medium leading-tight">{name}</div>
            <div className="text-[11px] leading-tight text-[var(--text-muted)]">{ROLE_LABELS[role]}</div>
          </div>
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
