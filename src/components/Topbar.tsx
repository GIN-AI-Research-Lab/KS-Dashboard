import type { Role } from "@prisma/client";
import { SignOutButton } from "@/components/SignOutButton";
import { SearchTrigger } from "@/components/SearchTrigger";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { RefreshControl } from "@/components/RefreshControl";
import { AppearanceMenu } from "@/components/appearance/AppearanceMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileMenuButton } from "@/components/sidebar/MobileMenuButton";
import { Avatar } from "@/components/Avatar";
import { formatRelativeTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import Link from "next/link";

export async function Topbar({
  name,
  role,
  image,
  lastActivity,
}: {
  name: string;
  role: Role;
  image?: string | null;
  lastActivity?: Date | null;
}) {
  const t = await getT();
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <MobileMenuButton />
        <SearchTrigger />
        {lastActivity && (
          <span
            className="hidden h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-[11px] text-[var(--text-muted)] lg:inline-flex"
            title={`${t("topbar.lastActivity")}: ${lastActivity.toLocaleString()}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-good)]" />
            {t("topbar.updatedPrefix")} {formatRelativeTime(lastActivity)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <RefreshControl />
        <LanguageSwitcher />
        <AppearanceMenu />
        <CopyLinkButton />
        <Link
          href="/me"
          className="flex h-9 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          <Avatar image={image} name={name} className="h-7 w-7" />
          <div className="text-right">
            <div className="text-xs font-medium leading-tight">{name}</div>
            <div className="text-[11px] leading-tight text-[var(--text-muted)]">{t(`roles.${role}`)}</div>
          </div>
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
