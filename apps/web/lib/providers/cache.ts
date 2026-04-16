// ============================================================
// TTL Memory Cache
// Simple in-process cache for external provider responses to
// avoid hammering free-tier APIs. Shared across provider modules.
// ============================================================

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Wrap an async loader with a TTL cache.
 * If a cached value exists and hasn't expired, return it.
 * Otherwise, invoke the loader, store the result, and return it.
 * Loader failures (returning null/undefined) are NOT cached — next call retries.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T | null>,
): Promise<T | null> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await loader();
  if (value != null) {
    store.set(key, { value, expiresAt: now + ttlMs });
  }
  return value;
}

/** Drop a specific key (for invalidation/testing). */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Drop all cache entries (for testing). */
export function clearAll(): void {
  store.clear();
}
