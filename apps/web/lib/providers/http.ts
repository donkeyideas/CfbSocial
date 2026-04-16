// ============================================================
// HTTP helper
// Shared fetch wrapper for external providers:
//   - AbortSignal timeout (default 8s)
//   - Optional single retry on network error
//   - JSON parse with graceful fallback to null
//   - Never throws — returns null on any failure
// ============================================================

export interface HttpOptions {
  timeoutMs?: number;
  retry?: boolean;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
}

async function doFetch(url: string, opts: HttpOptions): Promise<Response | null> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res;
  } catch {
    return null;
  }
}

/**
 * Fetch JSON from a URL with timeout + optional retry.
 * Returns null on any failure (network, non-2xx, invalid JSON).
 */
export async function getJson<T = unknown>(url: string, opts: HttpOptions = {}): Promise<T | null> {
  let res = await doFetch(url, opts);
  if ((!res || !res.ok) && opts.retry) {
    await new Promise((r) => setTimeout(r, 500));
    res = await doFetch(url, opts);
  }
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch text from a URL with timeout + optional retry.
 * Returns null on any failure.
 */
export async function getText(url: string, opts: HttpOptions = {}): Promise<string | null> {
  let res = await doFetch(url, opts);
  if ((!res || !res.ok) && opts.retry) {
    await new Promise((r) => setTimeout(r, 500));
    res = await doFetch(url, opts);
  }
  if (!res || !res.ok) return null;
  try {
    return await res.text();
  } catch {
    return null;
  }
}
