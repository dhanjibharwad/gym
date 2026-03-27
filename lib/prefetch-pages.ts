/**
 * Background Page Pre-fetcher
 * 
 * Pre-loads frequently visited pages in the background after initial dashboard load.
 * This ensures instant navigation - pages are already compiled and cached when user clicks.
 * 
 * Usage: Call prefetchDashboardPages() after dashboard data loads
 */

interface PrefetchConfig {
  url: string;
  priority: 'high' | 'medium' | 'low';
  delay: number; // Delay before prefetching (ms)
}

// Pages to prefetch based on typical user navigation patterns
const PRIORITY_PAGES: PrefetchConfig[] = [
  // High priority - most frequently accessed
  { url: '/api/members', priority: 'high', delay: 500 },
  { url: '/api/payments', priority: 'high', delay: 800 },
  { url: '/api/admin/staff', priority: 'high', delay: 1100 },
  
  // Medium priority - commonly accessed
  { url: '/api/membership-plans', priority: 'medium', delay: 1500 },
  { url: '/api/settings/payment-modes', priority: 'medium', delay: 1800 },
  { url: '/api/admin/roles', priority: 'medium', delay: 2100 },
  
  // Low priority - occasionally accessed
  { url: '/api/reports/overall?period=month', priority: 'low', delay: 2500 },
  { url: '/api/audit-logs?page=1&limit=100', priority: 'low', delay: 3000 },
];

/**
 * Prefetch a single URL
 * Uses low-priority fetch to avoid blocking main thread
 */
async function prefetchUrl(url: string): Promise<void> {
  try {
    // Use fetch with low priority to not block main thread
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // @ts-ignore - priority is experimental but supported in modern browsers
      priority: 'low',
    });
    
    if (response.ok) {
      console.log(`[Prefetch] ✅ Loaded: ${url}`);
    } else {
      console.warn(`[Prefetch] ⚠️ Failed (${response.status}): ${url}`);
    }
  } catch (error) {
    // Silent fail - prefetching is optional enhancement
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Prefetch] ❌ Error loading ${url}:`, error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Prefetch all dashboard pages in background
 * Staggered loading to avoid overwhelming the network/database
 */
export async function prefetchDashboardPages(): Promise<void> {
  console.log('[Prefetch] 🚀 Starting background page pre-loading...');
  const startTime = Date.now();
  
  // Group by priority
  const highPriority = PRIORITY_PAGES.filter(p => p.priority === 'high');
  const mediumPriority = PRIORITY_PAGES.filter(p => p.priority === 'medium');
  const lowPriority = PRIORITY_PAGES.filter(p => p.priority === 'low');
  
  // Load high priority pages first (sequentially to avoid DB overload)
  for (const page of highPriority) {
    setTimeout(() => {
      prefetchUrl(page.url);
    }, page.delay);
  }
  
  // Load medium priority pages
  for (const page of mediumPriority) {
    setTimeout(() => {
      prefetchUrl(page.url);
    }, page.delay);
  }
  
  // Load low priority pages
  for (const page of lowPriority) {
    setTimeout(() => {
      prefetchUrl(page.url);
    }, page.delay);
  }
  
  // Log completion time
  const maxDelay = Math.max(...PRIORITY_PAGES.map(p => p.delay));
  setTimeout(() => {
    const totalTime = Date.now() - startTime;
    console.log(`[Prefetch] ✅ All pages pre-loaded in ${totalTime}ms`);
  }, maxDelay + 100);
}

/**
 * Prefetch specific page on demand
 * Useful for hover-based preloading or predicted navigation
 */
export function prefetchPage(url: string): void {
  prefetchUrl(url);
}

/**
 * Smart prefetch based on user role
 * Prefetches pages most relevant to the user's role
 */
export function prefetchByRole(role: string): void {
  console.log(`[Prefetch] 🎯 Role-based prefetching for: ${role}`);
  
  // Common pages for all roles
  prefetchDashboardPages();
  
  // Role-specific optimizations can be added here
  if (role.toLowerCase() === 'admin') {
    setTimeout(() => {
      prefetchUrl('/api/reports/overall?period=day');
      prefetchUrl('/api/admin/permissions');
    }, 3500);
  }
}
