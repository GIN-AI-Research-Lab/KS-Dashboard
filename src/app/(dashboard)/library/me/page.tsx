import Link from "next/link";
import { MessageCircle, Zap, Star, FileText } from "lucide-react";
import { auth } from "@/auth";
import { getMyLibrary } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ItemManageBar } from "@/components/library/ItemManageBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { KIND_LABEL, KIND_VARIANT } from "@/lib/library";
import { formatRelativeTime } from "@/lib/format";

export default async function MyLibraryPage() {
  const session = await auth();
  const { mine, saved } = await getMyLibrary(session!.user.id);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            THƯ VIỆN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thư viện của <span className="gradient-text">tôi</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Bài mình đã đăng và các bài đã lưu</p>
        </div>
        <Link href="/library" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10">
          ← Thư viện chung
        </Link>
      </div>

      <Card title={`Bài của tôi (${mine.length})`}>
        {mine.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Bạn chưa đăng bài nào"
            hint="Prompt và skill bạn đăng sẽ xuất hiện ở đây"
          />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {mine.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={KIND_VARIANT[it.kind]}>{KIND_LABEL[it.kind]}</Badge>
                  <Link href={`/library/${it.id}`} className="truncate font-medium hover:underline">
                    {it.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {it._count.comments}</span>
                    <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4" /> {it._count.reactions}</span>
                    <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" /> {it._count.bookmarks}</span>
                  </span>
                </div>
                <ItemManageBar itemId={it.id} initialVisibility={it.visibility} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Đã lưu (${saved.length})`}>
        {saved.length === 0 ? (
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title="Chưa có bài đã lưu"
            hint="Bấm ★ trên một bài trong thư viện để lưu về đây"
          />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {saved.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={KIND_VARIANT[it.kind]}>{KIND_LABEL[it.kind]}</Badge>
                  <Link href={`/library/${it.id}`} className="truncate font-medium hover:underline">
                    {it.title}
                  </Link>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {it.author.name} · {formatRelativeTime(it.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
