// Server-rendered download link. Points at an /api/export/* route that streams
// a CSV with Content-Disposition: attachment, so a plain anchor triggers the
// download while carrying the session cookie -- no client JS needed.
export function ExportLink({ href, label = "Xuất CSV" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
    >
      <span aria-hidden>⭳</span>
      {label}
    </a>
  );
}
