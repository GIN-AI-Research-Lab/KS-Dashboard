// Tiny in-process TTL cache for company-wide dashboard aggregates. Because the
// dashboard auto-refreshes every ~5s for every open tab, without this each
// viewer would re-run the same heavy queries. These aggregates are identical for
// all viewers, so one cached value (a few seconds stale) serves everyone and the
// DB is hit at most once per TTL regardless of how many people are watching.
//
// Single-process, per-worker. Fine for a self-hosted company deployment; if you
// ever run multiple instances, move this to Redis or Postgres materialized views.

type Entry = { value: unknown; expires: number };

const globalForCache = globalThis as unknown as { statsCache?: Map<string, Entry> };
const store = globalForCache.statsCache ?? new Map<string, Entry>();
globalForCache.statsCache = store;

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

// Call after a mutation to drop stale aggregates (optional; entries also expire).
export function invalidateCache(prefix?: string) {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
