/**
 * Next.js Instrumentation Hook
 * Runs ONCE on server startup — pre-compiles all routes so the first
 * user click is never delayed by on-demand compilation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;

  await new Promise(resolve => setTimeout(resolve, 3000));

  const base = process.env.NEXTAUTH_URL || 'http://localhost:8004';
  const routes = ['/dashboard', '/dashboard/members', '/dashboard/payments'];

  for (const route of routes) {
    try {
      await fetch(`${base}${route}`, {
        headers: { 'x-warmup': '1' },
        signal: AbortSignal.timeout(5000),
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch {
      // silent fail
    }
  }
}
