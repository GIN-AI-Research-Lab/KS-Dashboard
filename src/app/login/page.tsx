"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const SSO_ERROR_KEYS: Record<string, string> = {
  NoEmailFromProvider: "login.ssoNoEmail",
  DomainNotAllowed: "login.ssoDomainNotAllowed",
  UnknownEmployee: "login.ssoUnknownEmployee",
};

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="0" y="0" width="7.3" height="7.3" fill="#f25022" />
      <rect x="8.7" y="0" width="7.3" height="7.3" fill="#7fba00" />
      <rect x="0" y="8.7" width="7.3" height="7.3" fill="#00a4ef" />
      <rect x="8.7" y="8.7" width="7.3" height="7.3" fill="#ffb900" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);

  // Derived directly from the URL on every render -- no need for state/effect
  // since it's just a projection of `params`, not something to subscribe to.
  const ssoErrorCode = params.get("error");
  const ssoError = ssoErrorCode
    ? t(SSO_ERROR_KEYS[ssoErrorCode] ?? "login.ssoDefaultError")
    : null;

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((providers: Record<string, unknown>) => setMicrosoftEnabled("microsoft-entra-id" in providers))
      .catch(() => setMicrosoftEnabled(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("login.credentialsError"));
      return;
    }
    router.push(params.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="gradient-brand flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold text-white shadow-[var(--shadow-xs)]">
            KS
          </div>
          <h1 className="text-lg font-semibold">KS Dashboard</h1>
          <p className="text-center text-sm text-[var(--text-muted)]">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              placeholder="ban@congty.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{t("login.password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              placeholder="••••••••"
            />
          </div>
          {(error || ssoError) && (
            <p className="text-xs text-[var(--status-critical)]">{error || ssoError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="group mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? t("login.signingIn") : t("login.signIn")}
            {!loading && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </button>
        </form>

        {microsoftEnabled && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <div className="h-px flex-1 bg-[var(--border)]" />
              {t("login.or")}
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <button
              type="button"
              onClick={() => signIn("microsoft-entra-id", { callbackUrl: params.get("callbackUrl") ?? "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--page)]"
            >
              <MicrosoftLogo />
              {t("login.microsoftSignIn")}
            </button>
          </>
        )}

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          {t("login.demoAccount")} <code>admin@company.com</code> / <code>admin1234</code>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
