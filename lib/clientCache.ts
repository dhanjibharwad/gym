/**
 * Client-side sessionStorage cache for API responses.
 * Data persists for the browser session — cleared on tab close / logout.
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in ms

interface CacheEntry {
  data: any;
  expiry: number;
}

function getKey(url: string) {
  return `cc:${url}`;
}

export function clientCacheGet<T>(url: string): T | null {
  try {
    const raw = sessionStorage.getItem(getKey(url));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiry) {
      sessionStorage.removeItem(getKey(url));
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

export function clientCacheSet(url: string, data: any, ttlMs = DEFAULT_TTL) {
  try {
    const entry: CacheEntry = { data, expiry: Date.now() + ttlMs };
    sessionStorage.setItem(getKey(url), JSON.stringify(entry));
  } catch {
    // sessionStorage full — ignore
  }
}

export function clientCacheDelete(url: string) {
  try {
    sessionStorage.removeItem(getKey(url));
  } catch {}
}

export function clientCacheDeletePattern(pattern: RegExp) {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('cc:') && pattern.test(k.slice(3)))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

/**
 * Fetch with client-side cache.
 * - If cached: returns cached data immediately, then revalidates in background.
 * - If not cached: fetches, caches, returns.
 * 
 * Pass onUpdate callback to receive background-refreshed data.
 */
export async function cachedFetch<T>(
  url: string,
  onUpdate?: (data: T) => void,
  ttlMs = DEFAULT_TTL
): Promise<T> {
  const cached = clientCacheGet<T>(url);

  if (cached !== null) {
    // Return cached immediately, revalidate in background
    if (onUpdate) {
      fetch(url)
        .then(r => r.json())
        .then((fresh: T) => {
          clientCacheSet(url, fresh, ttlMs);
          onUpdate(fresh);
        })
        .catch(() => {});
    }
    return cached;
  }

  // No cache — fetch and store
  const res = await fetch(url);
  const data: T = await res.json();
  clientCacheSet(url, data, ttlMs);
  return data;
}
