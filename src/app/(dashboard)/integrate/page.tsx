import { Card } from "@/components/ui/Card";
import { ExportLink } from "@/components/ExportLink";
import { getT } from "@/i18n/server";

export default async function IntegratePage() {
  const t = await getT();

  return (
    <div className="stagger mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("integrate.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">{t("integrate.title")}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("integrate.subtitle")}</p>
        </div>
      </div>

      <Card title={t("integrate.batSetupTitle")}>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            {t("integrate.batStep1")}
            <div className="mt-1">
              <ExportLink href="/api/download/setup-telemetry.bat" label={t("integrate.downloadBat")} />
            </div>
          </li>
          <li>{t("integrate.batStep2")}</li>
          <li>{t("integrate.step3")}</li>
          <li>{t("integrate.step4")}</li>
        </ol>
        <p className="mt-3 text-xs text-[var(--text-muted)]">{t("integrate.scriptNote")}</p>
      </Card>

      <Card title={t("integrate.noteTitle")}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-[var(--text-secondary)]">
          <li>{t("integrate.noteEndpoint")}</li>
          <li>{t("integrate.noteReachable")}</li>
          <li>{t("integrate.noteEmailMatch")}</li>
        </ul>
      </Card>

      <Card title={t("integrate.checkTitle")}>
        <p className="text-sm text-[var(--text-secondary)]">{t("integrate.checkBody")}</p>
      </Card>
    </div>
  );
}
