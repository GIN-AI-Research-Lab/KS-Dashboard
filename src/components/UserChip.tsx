"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/i18n/I18nProvider";

type Badge = { key: string; label: string; icon: string };
type BadgeData = { badges: Badge[]; earnedCount: number; totalCount: number };

// Cache badge data per user for the session so repeated hovers don't refetch.
const badgeCache = new Map<string, BadgeData>();

/**
 * A person's name, everywhere it appears: small avatar + name linking to their
 * profile, with a hover tooltip listing the badges they've earned. The tooltip
 * is fixed-positioned so it isn't clipped inside scrollable table containers.
 * stopPropagation on the link lets it work inside clickable rows.
 */
export function UserChip({
  userId,
  name,
  image,
  avatarClassName = "h-6 w-6",
}: {
  userId: string;
  name: string;
  image?: string | null;
  avatarClassName?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [data, setData] = useState<BadgeData | null>(() => badgeCache.get(userId) ?? null);
  const ref = useRef<HTMLSpanElement>(null);

  async function load() {
    if (badgeCache.has(userId)) {
      setData(badgeCache.get(userId)!);
      return;
    }
    try {
      const res = await fetch(`/api/users/${userId}/badges`);
      if (!res.ok) return;
      const d: BadgeData = await res.json();
      badgeCache.set(userId, d);
      setData(d);
    } catch {
      // ignore; tooltip just shows loading/empty
    }
  }

  function onEnter() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
    setOpen(true);
    void load();
  }

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center gap-1.5 align-middle"
      onMouseEnter={onEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <Avatar image={image} name={name} className={avatarClassName} iconClassName="h-3.5 w-3.5" />
      <Link
        href={`/users/${userId}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium transition-colors hover:text-accent hover:underline"
      >
        {name}
      </Link>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] w-max max-w-xs rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 shadow-[var(--shadow-md)]"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {data ? `${data.earnedCount} ${t("userChip.badgeCount")}` : t("userChip.badges")}
            </div>
            {data && data.badges.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">{t("userChip.noBadges")}</div>
            ) : (
              <div className="flex max-w-[16rem] flex-wrap gap-1.5">
                {(data?.badges ?? []).map((b) => (
                  <span
                    key={b.key}
                    title={b.label}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-xs"
                  >
                    <span aria-hidden>{b.icon}</span>
                    <span className="whitespace-nowrap">{b.label}</span>
                  </span>
                ))}
                {!data && <span className="text-xs text-[var(--text-muted)]">…</span>}
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
