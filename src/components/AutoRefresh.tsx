"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 5000;

// Routes that already stream their own realtime updates (SSE) and therefore
// don't need polling on top. Kept as prefixes.
const SKIP_PREFIXES = ["/live"];

/**
 * Headless global refresher. Mounted once in the dashboard layout, it re-fetches
 * the current route's Server Components every `intervalMs` via router.refresh(),
 * so whatever page the user is on stays live without per-page wiring.
 *
 * It only polls while the tab is actually visible (Page Visibility API): when the
 * tab is backgrounded the interval is torn down entirely, and when the user comes
 * back it refreshes once immediately and resumes polling. Nothing runs in the
 * background.
 */
export function AutoRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;

    const stop = () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const start = () => {
      if (timerRef.current != null) return;
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh(); // catch up immediately on return, then keep polling
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, pathname, intervalMs]);

  return null;
}
