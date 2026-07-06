import { Card } from "@/components/ui/Card";
import { getGlossaryGroups } from "@/lib/glossary";
import { getT } from "@/i18n/server";

export default async function GlossaryPage() {
  const t = await getT();
  const GLOSSARY = getGlossaryGroups(t);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("glossary.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">{t("glossary.title")}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("glossary.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {GLOSSARY.map((section) => (
          <Card key={section.group} title={section.group}>
            <dl className="flex flex-col divide-y divide-[var(--border)]">
              {section.items.map((it) => (
                <div key={it.term} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-sm font-medium text-[var(--text-primary)]">{it.term}</dt>
                  <dd className="text-sm leading-relaxed text-[var(--text-secondary)]">{it.desc}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
