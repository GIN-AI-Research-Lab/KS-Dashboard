import { ROLE_LABELS } from "@/lib/access";
import type { Role } from "@prisma/client";
import { SignOutButton } from "@/components/SignOutButton";
import { SearchTrigger } from "@/components/SearchTrigger";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import Link from "next/link";

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
      <SearchTrigger />
      <div className="flex items-center gap-3">
        <CopyLinkButton />
        <Link href="/me" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10">
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
