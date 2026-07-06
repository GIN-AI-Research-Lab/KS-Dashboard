// Server-side i18n helpers. Use these in Server Components / route handlers.
// `getLocale()` reads the cookie; `getDictionary()` returns the resolved
// dictionary object (pass it to <I18nProvider> for client components); `getT()`
// returns a bound translate function for server rendering.

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";
import { lookup, type Translate } from "./lookup";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return getDictionaryFor(locale ?? (await getLocale()));
}

export async function getT(locale?: Locale): Promise<Translate> {
  const dict = await getDictionary(locale);
  return (path: string) => lookup(dict, path);
}
