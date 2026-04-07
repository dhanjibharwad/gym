/**
 * Background API Pre-fetcher
 * Warms the server-side cache once per browser session after login.
 * Page route compilation is handled by Next.js router automatically.
 */

interface PrefetchConfig {
  url: string;
  delay: number;
}

// Session-level guard — fires ONCE per browser session only
let prefetchDone = false;

// Only prefetch the 3 most-visited pages after a delay
const API_PREFETCH: PrefetchConfig[] = [
  { url: '/api/membership-plans',       delay: 5000 },
  { url: '/api/settings/payment-modes', delay: 6000 },
  { url: '/api/members?limit=20',       delay: 7000 },
];

async function prefetchUrl(url: string): Promise<void> {
  try {
    await fetch(url, {
      method: 'GET',
      // @ts-ignore
      priority: 'low',
    });
  } catch {
    // Silent fail — prefetch is optional
  }
}

export function prefetchByRole(role: string): void {
  // Only run once per browser session
  if (prefetchDone) return;
  prefetchDone = true;

  for (const item of API_PREFETCH) {
    setTimeout(() => prefetchUrl(item.url), item.delay);
  }
}

export function prefetchPage(url: string): void {
  prefetchUrl(url);
}

// Reset for logout (call this on logout if needed)
export function resetPrefetchState(): void {
  prefetchDone = false;
}
