"use client";

import { useSyncExternalStore } from "react";

// Per-viewer auto-refresh preference, stored in localStorage (no server round-trip
// so reading it costs nothing). Default is OFF: the dashboard does NOT poll on its
// own -- the user refreshes manually or opts into an interval from the topbar.
// This keeps request volume near zero when viewed over the ngrok tunnel (which has
// a tight free-tier request quota); see deploy notes.
export const REFRESH_KEY = "ks-refresh-interval-ms";
export const REFRESH_EVENT = "ks-refresh-interval-change";

// ms === 0 means "off" (manual refresh only). labelKey resolves via i18n at render.
export const REFRESH_OPTIONS: { labelKey: string; ms: number }[] = [
  { labelKey: "ui.refreshOff", ms: 0 },
  { labelKey: "ui.refresh10s", ms: 10_000 },
  { labelKey: "ui.refresh30s", ms: 30_000 },
  { labelKey: "ui.refresh1m", ms: 60_000 },
  { labelKey: "ui.refresh5m", ms: 300_000 },
];

export function getRefreshInterval(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(localStorage.getItem(REFRESH_KEY));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function setRefreshInterval(ms: number): void {
  localStorage.setItem(REFRESH_KEY, String(ms));
  // Notify listeners in this tab immediately (storage event only fires in OTHER tabs).
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: ms }));
}

function subscribeRefresh(onChange: () => void) {
  window.addEventListener(REFRESH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(REFRESH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Live-updating hook: reflects changes made from the topbar control (same tab via
// the custom event) and from other tabs (via the native storage event). Uses
// useSyncExternalStore so there is no setState-in-effect and it stays SSR-safe
// (returns 0 = off during server render).
export function useRefreshInterval(): number {
  return useSyncExternalStore(subscribeRefresh, getRefreshInterval, () => 0);
}
