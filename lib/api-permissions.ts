import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, hasPermission, hasAnyPermission } from './rbac';
import { cache } from './cache/MemoryCache';
import pool from './db';

/**
 * Extract session from middleware-injected headers.
 * The middleware already verified the JWT — no DB hit needed here.
 */
function getSessionFromHeaders(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const companyId = request.headers.get('x-company-id');
  const role = request.headers.get('x-user-role');

  if (!userId || !role) return null;

  return {
    user: {
      id: parseInt(userId),
      companyId: companyId ? parseInt(companyId) : null,
      role,
    },
  };
}

/**
 * Get user permissions — cached for 5 minutes per user.
 * Admin roles skip this entirely.
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const cacheKey = `user:permissions:${userId}`;
  const cached = cache.get<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const result = await pool.query(
      `SELECT DISTINCT p.name 
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = $1`,
      [userId]
    );
    const permissions = result.rows.map((row: any) => row.name);
    cache.set(cacheKey, permissions, 300); // 5 minutes
    return permissions;
  } catch {
    return [];
  }
}

export function invalidateUserPermissionsCache(userId: number): void {
  cache.delete(`user:permissions:${userId}`);
}

export async function checkPermission(
  request: NextRequest,
  requiredPermission: string
): Promise<{ authorized: boolean; response?: NextResponse; session?: any }> {
  const session = getSessionFromHeaders(request);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (isAdmin(session.user.role)) {
    return { authorized: true, session };
  }

  const userPermissions = await getUserPermissions(session.user.id);

  if (!hasPermission(userPermissions, requiredPermission, session.user.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
      session,
    };
  }

  return { authorized: true, session };
}

export async function checkAnyPermission(
  request: NextRequest,
  requiredPermissions: string[]
): Promise<{ authorized: boolean; response?: NextResponse; session?: any; userPermissions?: string[] }> {
  const session = getSessionFromHeaders(request);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (isAdmin(session.user.role)) {
    return { authorized: true, session, userPermissions: [] };
  }

  const userPermissions = await getUserPermissions(session.user.id);

  if (!hasAnyPermission(userPermissions, requiredPermissions, session.user.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
      session,
      userPermissions,
    };
  }

  return { authorized: true, session, userPermissions };
}

export async function requireAuth(
  request: NextRequest
): Promise<{ authorized: boolean; response?: NextResponse; session?: any }> {
  const session = getSessionFromHeaders(request);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { authorized: true, session };
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ authorized: boolean; response?: NextResponse; session?: any }> {
  const session = getSessionFromHeaders(request);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!isAdmin(session.user.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 }),
      session,
    };
  }

  return { authorized: true, session };
}

export async function withPermission(
  request: NextRequest,
  permission: string,
  handler: (session: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const { authorized, response, session } = await checkPermission(request, permission);
  if (!authorized) return response!;
  return handler(session);
}

export async function withAnyPermission(
  request: NextRequest,
  permissions: string[],
  handler: (session: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const { authorized, response, session } = await checkAnyPermission(request, permissions);
  if (!authorized) return response!;
  return handler(session);
}
