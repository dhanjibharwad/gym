/**
 * Background Page Pre-fetcher - OPTIMIZED
 * 
 * Pre-loads frequently visited pages in the background after initial dashboard load.
 * OPTIMIZED to prevent database overload with request deduplication and throttling.
 * 
 * Usage: Call prefetchDashboardPages() after dashboard data loads
 */

interface PrefetchConfig {
  url: string;
  priority: 'high' | 'medium' | 'low';
  delay: number; // Delay before prefetching (ms)
}

// Request deduplication - track pending requests
const pendingRequests = new Set<string>();
const completedRequests = new Set<string>();
const REQUEST_COOLDOWN = 60000; // 1 minute cooldown for completed requests

// Pages to prefetch based on typical user navigation patterns
// IMPORTANT: Prefetching both pages AND APIs triggers Next.js compilation
const PRIORITY_PAGES: PrefetchConfig[] = [
  // High priority - most frequently accessed (0-500ms delays)
  { url: '/api/members?limit=50', priority: 'high', delay: 0 },
  { url: '/api/admin/staff', priority: 'high', delay: 200 },
  { url: '/api/membership-plans', priority: 'high', delay: 400 },
  { url: '/api/settings/payment-modes', priority: 'high', delay: 600 },
  
  // Medium priority - commonly accessed (800-1500ms delays)
  { url: '/api/admin/roles', priority: 'medium', delay: 800 },
  { url: '/api/payments', priority: 'medium', delay: 1000 },
  { url: '/api/reports/overall?period=month', priority: 'medium', delay: 1200 },
  { url: '/api/audit-logs?page=1&limit=100', priority: 'medium', delay: 1400 },
  { url: '/api/settings', priority: 'medium', delay: 1600 },
  { url: '/api/auth/me', priority: 'medium', delay: 1800 },
  
  // Low priority - occasionally accessed (2000-3000ms delays)
  { url: '/api/settings/receipt-template', priority: 'low', delay: 2000 },
  { url: '/api/auth/profile', priority: 'low', delay: 2500 },
];

// Page routes to prefetch (triggers compilation of page components)
const PAGE_ROUTES: PrefetchConfig[] = [
  { url: '/dashboard/members', priority: 'high', delay: 300 },
  { url: '/dashboard/ourstaff', priority: 'high', delay: 500 },
  { url: '/dashboard/membership-plans', priority: 'high', delay: 700 },
  { url: '/dashboard/payments', priority: 'medium', delay: 900 },
  { url: '/dashboard/reports', priority: 'medium', delay: 1100 },
  { url: '/dashboard/audit-logs', priority: 'medium', delay: 1300 },
  { url: '/dashboard/settings', priority: 'medium', delay: 1500 },
  { url: '/dashboard/profile', priority: 'low', delay: 2200 },
  { url: '/dashboard/receipt-template', priority: 'low', delay: 2700 },
  { url: '/dashboard/history', priority: 'low', delay: 3000 },
];

/**
 * Prefetch a single URL with deduplication
 * Prevents duplicate requests and database overload
 */
async function prefetchUrl(url: string): Promise<void> {
  // Skip if already pending or recently completed
  if (pendingRequests.has(url)) {
    console.log(`[Prefetch] ⏭️ Skipping ${url} - already pending`);
    return;
  }
  
  if (completedRequests.has(url)) {
    console.log(`[Prefetch] ⏭️ Skipping ${url} - already completed`);
    return;
  }
  
  try {
    // Mark as pending
    pendingRequests.add(url);
    
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
      completedRequests.add(url);
      
      // Remove from pending
      pendingRequests.delete(url);
      
      // Clean up completed requests after cooldown
      setTimeout(() => {
        completedRequests.delete(url);
      }, REQUEST_COOLDOWN);
    } else {
      console.warn(`[Prefetch] ⚠️ Failed (${response.status}): ${url}`);
      pendingRequests.delete(url);
    }
  } catch (error) {
    // Silent fail - prefetching is optional enhancement
    pendingRequests.delete(url);
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Prefetch] ❌ Error loading ${url}:`, error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Prefetch all dashboard pages in background - THROTTLED
 * Staggered loading to avoid overwhelming the network/database
 * CRITICAL: This pre-compiles ALL pages and APIs for instant navigation
 * OPTIMIZED: Added request deduplication and increased delays
 */
export async function prefetchDashboardPages(): Promise<void> {
  console.log('[Prefetch] 🚀 Starting THROTTLED page pre-loading and compilation...');
  const startTime = Date.now();
  
  // Group by priority
  const highPriority = PRIORITY_PAGES.filter(p => p.priority === 'high');
  const mediumPriority = PRIORITY_PAGES.filter(p => p.priority === 'medium');
  const lowPriority = PRIORITY_PAGES.filter(p => p.priority === 'low');
  
  console.log(`[Prefetch] 📊 Queuing ${highPriority.length} high, ${mediumPriority.length} medium, ${lowPriority.length} low priority requests`);
  
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
  
  // ALSO prefetch page routes (triggers compilation)
  const highPriorityPages = PAGE_ROUTES.filter(p => p.priority === 'high');
  const mediumPriorityPages = PAGE_ROUTES.filter(p => p.priority === 'medium');
  const lowPriorityPages = PAGE_ROUTES.filter(p => p.priority === 'low');
  
  for (const page of highPriorityPages) {
    setTimeout(() => {
      prefetchUrl(page.url);
    }, page.delay);
  }
  
  for (const page of mediumPriorityPages) {
    setTimeout(() => {
      prefetchUrl(page.url);
    }, page.delay);
  }
  
  for (const page of lowPriorityPages) {
    setTimeout(() => {
      prefetchUrl(page.url);
    }, page.delay);
  }
  
  // Log completion time
  const maxDelay = Math.max(
    ...PRIORITY_PAGES.map(p => p.delay),
    ...PAGE_ROUTES.map(p => p.delay)
  );
  setTimeout(() => {
    const totalTime = Date.now() - startTime;
    const totalRequests = PRIORITY_PAGES.length + PAGE_ROUTES.length;
    console.log(`[Prefetch] ✅ All ${totalRequests} pages/APIs queued in ${totalTime}ms`);
    console.log('[Prefetch] 🎉 Navigation should be fast with reduced DB load!');
  }, maxDelay + 500);
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
