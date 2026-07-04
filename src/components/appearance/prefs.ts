"use client";

import { useSyncExternalStore } from "react";

// Appearance preferences (theme / accent / density) live in localStorage and
// are mirrored onto <html> attributes. A no-flash inline script in the root
// layout applies them before first paint; these helpers keep them in sync at
// runtime and are shared by the AppearanceMenu and the command palette.

export const ACCENTS = [
  { key: "blue", label: "Xanh dương", color: "#2a78d6" },
  { key: "violet", label: "Tím", color: "#6d5ae6" },
  { key: "emerald", label: "Emerald", color: "#0f9d6b" },
  { key: "amber", label: "Amber", color: "#b8730a" },
  { key: "rose", label: "Hồng", color: "#e03e6d" },
] as const;

export const DENSITIES = [
  { key: "comfortable", label: "Thoáng" },
  { key: "compact", label: "Gọn" },
] as const;

export const THEMES = [
  { key: "light", label: "Sáng" },
  { key: "system", label: "Theo hệ thống" },
  { key: "dark", label: "Tối" },
] as const;

const EVENT = "app-pref-change";

export function readPref(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function usePref(key: string, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => readPref(key, fallback),
    () => fallback
  );
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

export function applyAccent(v: string) {
  const el = document.documentElement;
  if (v && v !== "blue") el.setAttribute("data-accent", v);
  else el.removeAttribute("data-accent"); // blue is the :root default
}

export function applyDensity(v: string) {
  const el = document.documentElement;
  if (v === "compact") el.setAttribute("data-density", "compact");
  else el.removeAttribute("data-density");
}

export function applyTheme(pref: string) {
  const resolved =
    !pref || pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function setAccent(v: string) {
  try {
    localStorage.setItem("accent", v);
  } catch {}
  applyAccent(v);
  notify();
}

export function setDensity(v: string) {
  try {
    localStorage.setItem("density", v);
  } catch {}
  applyDensity(v);
  notify();
}

export function setTheme(v: string) {
  try {
    localStorage.setItem("theme", v);
  } catch {}
  applyTheme(v);
  notify();
}
