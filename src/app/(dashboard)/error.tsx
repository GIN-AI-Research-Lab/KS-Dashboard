"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

// Error boundary for the dashboard segment: replaces the browser/webview generic
// "couldn't load" with a branded reset UI, and surfaces the actual error (message
// for client errors; digest to correlate with server logs for server errors).
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          background: "color-mix(in srgb, var(--status-critical) 15%, transparent)",
          color: "var(--status-critical)",
        }}
      >
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Không tải được trang</h2>
        <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">
          Đã có lỗi khi hiển thị trang này. Thử tải lại — nếu vẫn lỗi, gửi ảnh chụp phần chi tiết bên dưới cho quản trị.
        </p>
      </div>
      {(error?.message || error?.digest) && (
        <pre className="max-w-lg overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-left text-xs text-[var(--text-muted)]">
          {error?.message || "Lỗi phía máy chủ"}
          {error?.digest ? `\n(mã: ${error.digest})` : ""}
        </pre>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-colors hover:bg-accent-hover"
        >
          <RotateCw className="h-4 w-4" />
          Tải lại
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          <Home className="h-4 w-4" />
          Về Tổng quan
        </a>
      </div>
    </div>
  );
}
