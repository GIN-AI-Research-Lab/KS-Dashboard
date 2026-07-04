import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getLibraryItem } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { Badge, Tag } from "@/components/ui/Badge";
import { LibraryStar } from "@/components/library/LibraryStar";
import { LibraryReactions } from "@/components/library/LibraryReactions";
import { LibraryComments } from "@/components/library/LibraryComments";
import { ItemManageBar } from "@/components/library/ItemManageBar";
import { CopyTextButton } from "@/components/CopyTextButton";
import { KIND_LABEL, KIND_VARIANT, parseTags } from "@/lib/library";
import { renderMarkdown } from "@/lib/markdown";
import { formatRelativeTime } from "@/lib/format";

export default async function LibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const data = await getLibraryItem(id, session!.user.id);
  if (!data) notFound();

  const { item } = data;
  const isOwner = item.authorId === session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";
  // Private items are visible only to their author (or an admin).
  if (item.visibility === "PRIVATE" && !isOwner && !isAdmin) notFound();

  return (
    <div className="stagger mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-accent hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Thư viện
        </Link>
        <div className="hero-panel relative mt-2 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] backdrop-blur">
              <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
              THƯ VIỆN
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={KIND_VARIANT[item.kind]}>{KIND_LABEL[item.kind]}</Badge>
              <h1 className="text-xl font-semibold tracking-tight">{item.title}</h1>
              {item.visibility === "PRIVATE" && <Badge variant="neutral">Riêng tư</Badge>}
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {item.author.name} · {formatRelativeTime(item.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LibraryStar itemId={item.id} initialBookmarked={data.bookmarked} initialCount={data.bookmarkCount} />
            <CopyTextButton text={item.body} />
            {isOwner && <ItemManageBar itemId={item.id} initialVisibility={item.visibility} redirectOnDelete="/library" />}
          </div>
        </div>
      </div>

      <Card title={item.kind === "PROMPT" ? "Nội dung prompt" : "Mô tả skill"}>
        <div className="max-w-none">{renderMarkdown(item.body)}</div>
        {parseTags(item.tags).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
            {parseTags(item.tags).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </Card>

      <Card title="React">
        <LibraryReactions itemId={item.id} initialCounts={data.reactionCounts} initialMine={data.myReactions} />
      </Card>

      <Card title={`Bình luận (${item.comments.length})`}>
        <LibraryComments
          itemId={item.id}
          initialComments={item.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            authorName: c.author.name,
          }))}
        />
      </Card>
    </div>
  );
}
