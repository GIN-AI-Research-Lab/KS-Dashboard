"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SSO_ERROR_MESSAGES: Record<string, string> = {
  NoEmailFromProvider: "Tài khoản Microsoft này không trả về địa chỉ email.",
  DomainNotAllowed: "Email này không thuộc domain công ty được phép đăng nhập.",
  UnknownEmployee: "Không tìm thấy nhân viên khớp với email này trong hệ thống.",
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);

  // Derived directly from the URL on every render -- no need for state/effect
  // since it's just a projection of `params`, not something to subscribe to.
  const ssoErrorCode = params.get("error");
  const ssoError = ssoErrorCode
    ? (SSO_ERROR_MESSAGES[ssoErrorCode] ?? "Đăng nhập thất bại. Vui lòng thử lại.")
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
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }
    router.push(params.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="gradient-brand flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold text-white shadow-[var(--shadow-xs)]">
            KS
          </div>
          <h1 className="text-lg font-semibold">KS Dashboard</h1>
          <p className="text-center text-sm text-[var(--text-muted)]">
            Đăng nhập để xem mức sử dụng Claude Code của công ty
          </p>
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
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              placeholder="••••••••"
            />
          </div>
          {(error || ssoError) && <p className="text-xs text-[#d03b3b]">{error || ssoError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        {microsoftEnabled && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <div className="h-px flex-1 bg-[var(--border)]" />
              hoặc
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <button
              type="button"
              onClick={() => signIn("microsoft-entra-id", { callbackUrl: params.get("callbackUrl") ?? "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--page)]"
            >
              <MicrosoftLogo />
              Đăng nhập bằng Microsoft
            </button>
          </>
        )}

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Tài khoản demo: <code>admin@company.com</code> / <code>admin1234</code>
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
