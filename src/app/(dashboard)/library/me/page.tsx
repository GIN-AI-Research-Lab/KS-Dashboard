import Link from "next/link";
import { auth } from "@/auth";
import { getMyLibrary } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ItemManageBar } from "@/components/library/ItemManageBar";
import { KIND_LABEL, KIND_VARIANT } from "@/lib/library";
import { formatRelativeTime } from "@/lib/format";

export default async function MyLibraryPage() {
  const session = await auth();
  const { mine, saved } = await getMyLibrary(session!.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Thư viện của tôi</h1>
          <p className="text-sm text-[var(--text-muted)]">Bài mình đã đăng và các bài đã lưu</p>
        </div>
        <Link href="/library" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
          ← Thư viện chung
        </Link>
      </div>

      <Card title={`Bài của tôi (${mine.length})`}>
        {mine.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Bạn chưa đăng bài nào.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {mine.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant={KIND_VARIANT[it.kind]}>{KIND_LABEL[it.kind]}</Badge>
                  <Link href={`/library/${it.id}`} className="truncate font-medium hover:underline">
                    {it.title}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    💬 {it._count.comments} · ⚡ {it._count.reactions} · ★ {it._count.bookmarks}
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
          <p className="text-sm text-[var(--text-muted)]">Chưa lưu bài nào. Bấm ★ trên một bài để lưu.</p>
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
