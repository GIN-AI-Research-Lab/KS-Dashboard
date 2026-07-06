// Dot-path lookup into a dictionary object, shared by the server `getT` helper
// and the client `useT` hook. Missing keys fall back to the key itself so
// untranslated strings are visible (and greppable) during incremental migration.

export function lookup(dict: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>((obj, key) => (obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined), dict);
  return typeof value === "string" ? value : path;
}

export type Translate = (path: string) => string;
