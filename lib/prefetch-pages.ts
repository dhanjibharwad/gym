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

// Only the most critical APIs — reduces console noise and DB load on login
// Start after 8s so dashboard fully loads first
const API_PREFETCH: PrefetchConfig[] = [
  { url: '/api/members?limit=50',             delay: 8000  },
  { url: '/api/membership-plans',             delay: 8500  },
  { url: '/api/settings/payment-modes',       delay: 9000  },
  { url: '/api/payments',                     delay: 9500  },
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

  // Admin-only extras
  if (role.toLowerCase() === 'admin') {
    setTimeout(() => prefetchUrl('/api/admin/permissions'), 10000);
  }
}

export function prefetchPage(url: string): void {
  prefetchUrl(url);
}

// Reset for logout (call this on logout if needed)
export function resetPrefetchState(): void {
  prefetchDone = false;
}
