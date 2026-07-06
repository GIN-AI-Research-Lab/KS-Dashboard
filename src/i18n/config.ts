// i18n configuration. Cookie-based locale (no URL routing): the active locale
// is read server-side from the `ks_locale` cookie and threaded to a client
// provider. Dynamic data (department/user/session names, OTel telemetry) is
// never translated -- only static UI strings live in the dictionaries.

export const LOCALES = ["vi", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

// Cookie name holding the active locale. Also mirrored to User.locale on change.
export const LOCALE_COOKIE = "ks_locale";

// Native names shown in the language switcher.
export const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ja: "日本語",
};

// Flag emoji shown as the switcher's icon; the active locale's flag becomes the
// main icon on the topbar.
export const LOCALE_FLAGS: Record<Locale, string> = {
  vi: "🇻🇳",
  en: "🇬🇧",
  ja: "🇯🇵",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
