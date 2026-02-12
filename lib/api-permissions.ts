/**
 * API Permission Middleware
 * 
 * Helper functions for enforcing permissions in API routes.
 * These functions work with Next.js API routes and middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import pool from './db';
import { isAdmin, hasPermission, hasAnyPermission } from './rbac';

/**
 * Get user permissions from database
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.name 
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Check if user has required permission
 * Returns authorization result with session data
 */
export async function checkPermission(
  request: NextRequest,
  requiredPermission: string
): Promise<{
  authorized: boolean;
  response?: NextResponse;
  session?: any;
  userPermissions?: string[];
}> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    // Admin bypass - admin has all permissions
    if (isAdmin(session.user.role)) {
      return {
        authorized: true,
        session,
        userPermissions: []
      };
    }

    // Get user permissions from database
    const userPermissions = await getUserPermissions(session.user.id);

    // Check if user has the required permission
    if (!hasPermission(userPermissions, requiredPermission, session.user.role)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        ),
        session,
        userPermissions
      };
    }

    return {
      authorized: true,
      session,
      userPermissions
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Check if user has any of the required permissions
 */
export async function checkAnyPermission(
  request: NextRequest,
  requiredPermissions: string[]
): Promise<{
  authorized: boolean;
  response?: NextResponse;
  session?: any;
  userPermissions?: string[];
}> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    // Admin bypass - admin has all permissions
    if (isAdmin(session.user.role)) {
      return {
        authorized: true,
        session,
        userPermissions: []
      };
    }

    // Get user permissions from database
    const userPermissions = await getUserPermissions(session.user.id);

    // Check if user has any of the required permissions
    if (!hasAnyPermission(userPermissions, requiredPermissions, session.user.role)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        ),
        session,
        userPermissions
      };
    }

    return {
      authorized: true,
      session,
      userPermissions
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Require authentication only (no permission check)
 * Useful for endpoints that any logged-in user can access
 */
export async function requireAuth(
  request: NextRequest
): Promise<{
  authorized: boolean;
  response?: NextResponse;
  session?: any;
}> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    return {
      authorized: true,
      session
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{
  authorized: boolean;
  response?: NextResponse;
  session?: any;
}> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    if (!isAdmin(session.user.role)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Forbidden - Admin access required' },
          { status: 403 }
        ),
        session
      };
    }

    return {
      authorized: true,
      session
    };
  } catch (error) {
    console.error('Admin check error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Higher-order function to wrap API handlers with permission checks
 * 
 * Usage:
 * export async function GET(request: NextRequest) {
 *   return withPermission(request, 'view_members', async (session) => {
 *     // Your handler code here
 *     return NextResponse.json({ data: ... });
 *   });
 * }
 */
export async function withPermission(
  request: NextRequest,
  permission: string,
  handler: (session: any, userPermissions?: string[]) => Promise<NextResponse>
): Promise<NextResponse> {
  const { authorized, response, session, userPermissions } = await checkPermission(
    request,
    permission
  );

  if (!authorized) {
    return response!;
  }

  return handler(session, userPermissions);
}

/**
 * Higher-order function for requiring any of multiple permissions
 */
export async function withAnyPermission(
  request: NextRequest,
  permissions: string[],
  handler: (session: any, userPermissions?: string[]) => Promise<NextResponse>
): Promise<NextResponse> {
  const { authorized, response, session, userPermissions } = await checkAnyPermission(
    request,
    permissions
  );

  if (!authorized) {
    return response!;
  }

  return handler(session, userPermissions);
}
