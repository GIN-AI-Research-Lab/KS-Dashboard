"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRefreshInterval } from "@/components/refresh/refreshPrefs";

// Routes that already stream their own realtime updates (SSE) and therefore
// don't need polling on top. Kept as prefixes.
const SKIP_PREFIXES = ["/live"];

/**
 * Headless global refresher. Mounted once in the dashboard layout, it re-fetches
 * the current route's Server Components via router.refresh() on the interval the
 * user chose in the topbar RefreshControl.
 *
 * IMPORTANT: the default is OFF (interval 0). Polling used to be a hardcoded 5s,
 * which over the ngrok tunnel burned through its free request quota in ~days.
 * Now nothing polls unless the viewer explicitly opts into an interval.
 *
 * When on, it only polls while the tab is actually visible (Page Visibility API):
 * backgrounded tabs tear the interval down; returning refreshes once immediately
 * and resumes.
 */
export function AutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const intervalMs = useRefreshInterval(); // 0 = off (default)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalMs <= 0) return; // off => never poll
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
