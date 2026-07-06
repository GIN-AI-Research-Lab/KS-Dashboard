import Link from "next/link";
import { MessageCircle, Zap, Lightbulb } from "lucide-react";
import { auth } from "@/auth";
import { getLibraryFeed } from "@/lib/stats";
import { Badge, Tag } from "@/components/ui/Badge";
import { LibraryComposer } from "@/components/library/LibraryComposer";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { LibraryStar } from "@/components/library/LibraryStar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KIND_LABEL, KIND_VARIANT, parseTags } from "@/lib/library";
import { markdownExcerpt, firstImage } from "@/lib/markdown";
import { formatRelativeTime } from "@/lib/format";
import type { LibraryItemKind } from "@prisma/client";

const VALID_KINDS: LibraryItemKind[] = ["PROMPT", "SKILL"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; sort?: string; q?: string }>;
}) {
  const { kind, sort, q } = await searchParams;
  const session = await auth();
  const items = await getLibraryFeed({
    kind: VALID_KINDS.includes((kind ?? "") as LibraryItemKind) ? (kind as LibraryItemKind) : undefined,
    sort: sort ?? "new",
    q: q || undefined,
    viewerId: session!.user.id,
  });

  return (
    <div className="stagger mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            THƯ VIỆN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thư <span className="gradient-text">viện</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Prompt &amp; skill mọi người chia sẻ — comment, react, lưu về tài khoản</p>
        </div>
        <Link href="/library/me" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10">
          Thư viện của tôi
        </Link>
      </div>

      <LibraryComposer />
      <LibraryFilters />

      {items.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-6 w-6" />}
          title="Chưa có bài nào"
          hint="Hãy đăng prompt hoặc skill đầu tiên để chia sẻ với mọi người"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((it) => {
            const thumb = firstImage(it.body);
            return (
              <article key={it.id} className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="hidden h-24 w-32 shrink-0 rounded-lg object-cover sm:block" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={KIND_VARIANT[it.kind]}>{KIND_LABEL[it.kind]}</Badge>
                    {it.kind === "SKILL" && it.skillName && (
                      <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)] dark:bg-white/10">/{it.skillName}</code>
                    )}
                    {parseTags(it.tags).slice(0, 3).map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>

                  <Link href={`/library/${it.id}`}>
                    <h2 className="text-lg font-semibold leading-snug hover:underline">{it.title}</h2>
                  </Link>

                  <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">{markdownExcerpt(it.body)}</p>

                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4a3aa7]/15 text-[10px] font-semibold text-[#4a3aa7]">
                      {it.author.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>{it.author.name}</span>
                    <span>· {formatRelativeTime(it.createdAt)}</span>
                    <span className="ml-auto flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {it.counts.comments}</span>
                      <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4" /> {it.counts.reactions}</span>
                    </span>
                    <LibraryStar itemId={it.id} initialBookmarked={it.bookmarked} initialCount={it.counts.bookmarks} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
