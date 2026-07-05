import { ROLE_LABELS } from "@/lib/access";
import type { Role } from "@prisma/client";
import { SignOutButton } from "@/components/SignOutButton";
import { SearchTrigger } from "@/components/SearchTrigger";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { AppearanceMenu } from "@/components/appearance/AppearanceMenu";
import { MobileMenuButton } from "@/components/sidebar/MobileMenuButton";
import { formatRelativeTime } from "@/lib/format";
import Link from "next/link";

export function Topbar({
  name,
  role,
  lastActivity,
}: {
  name: string;
  role: Role;
  lastActivity?: Date | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <MobileMenuButton />
        <SearchTrigger />
        {lastActivity && (
          <span
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] lg:inline-flex"
            title={`Hoạt động gần nhất: ${lastActivity.toLocaleString("vi-VN")}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-good)]" />
            Cập nhật {formatRelativeTime(lastActivity)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <AppearanceMenu />
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
