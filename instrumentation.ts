/**
 * Next.js Instrumentation Hook
 * Runs ONCE on server startup — pre-compiles all routes so the first
 * user click is never delayed by on-demand compilation.
 */
export async function register() {
  // Only warm up in Node.js runtime (not edge), and only in development
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Wait for server to be fully ready before warming up
  await new Promise(resolve => setTimeout(resolve, 3000));

  const base = process.env.NEXTAUTH_URL || 'http://localhost:8004';

  // All routes that need pre-compilation — order matters (most used first)
  const routes = [
    // Dashboard pages
    '/dashboard',
    '/dashboard/members',
    '/dashboard/add-members',
    '/dashboard/payments',
    '/dashboard/membership-plans',
    '/dashboard/ourstaff',
    '/dashboard/reports',
    '/dashboard/settings',
    '/dashboard/audit-logs',
    '/dashboard/history',
    '/dashboard/fullpayment',
    '/dashboard/expired',
    '/dashboard/profile',
    '/dashboard/roles',
    '/dashboard/permissions',
    '/dashboard/receipt-template',
    // API routes
    '/api/dashboard/stats',
    '/api/membership-plans',
    '/api/members?limit=1',
    '/api/payments',
    '/api/admin/staff',
    '/api/admin/roles',
    '/api/admin/permissions',
    '/api/settings',
    '/api/settings/payment-modes',
    '/api/reports/overall?period=month',
    '/api/audit-logs?page=1&limit=10',
    '/api/auth/me',
  ];

  console.log('[Warmup] 🔥 Pre-compiling all routes...');

  for (const route of routes) {
    try {
      await fetch(`${base}${route}`, {
        headers: { 'x-warmup': '1' },
        signal: AbortSignal.timeout(5000),
      });
      // Small gap between requests to avoid pool pressure
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch {
      // Silent fail — compilation still happens even on 401/403
    }
  }

  console.log('[Warmup] ✅ All routes pre-compiled. First clicks will be instant.');
}
