import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/', '/unauthorized', '/setup', '/superadmin/login', '/superadmin'];
const authPaths = ['/auth/login', '/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value;

  // Skip middleware for static files, API routes, and setup
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    // Redirect authenticated users away from auth pages
    if (token && authPaths.some(path => pathname.startsWith(path))) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch {
        // Invalid token, allow access to auth pages
        const response = NextResponse.next();
        response.cookies.delete('session');
        return response;
      }
    }
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Verify JWT and extract company context
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { userId, companyId, role } = payload as { userId: number; companyId: number; role: string };

    // Add tenant context to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId.toString());
    requestHeaders.set('x-company-id', companyId.toString());
    requestHeaders.set('x-user-role', role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)']
};