import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import { ALL_PERMISSION_NAMES } from '@/lib/permissions';
import { isAdmin } from '@/lib/rbac';
import { cache } from '@/lib/cache/MemoryCache';

export async function GET(request: NextRequest) {
  try {
    // Try headers first (set by middleware — no DB hit)
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const companyId = request.headers.get('x-company-id');

    // If middleware headers are present, use them; otherwise fall back to getSession()
    let sessionUserId: number | null = userId ? parseInt(userId) : null;
    let sessionRole: string | null = role;
    let sessionCompanyId: number | null = companyId ? parseInt(companyId) : null;

    if (!sessionUserId || !sessionRole) {
      const session = await getSession();
      if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'No valid session' }, { status: 401 });
      }
      sessionUserId = session.user.id;
      sessionRole = session.user.role;
      sessionCompanyId = session.user.companyId ?? null;
    }

    // SuperAdmin — no DB lookup needed
    if (sessionRole === 'SuperAdmin') {
      return NextResponse.json({
        success: true,
        user: {
          id: sessionUserId,
          name: 'Super Administrator',
          role: 'SuperAdmin',
          permissions: ['*'],
          isAdmin: true,
          companyName: 'System',
          companyId: null,
        },
      });
    }

    // Cache full user profile for 5 minutes — avoids DB hit on every page navigation
    const cacheKey = `user:profile:${sessionUserId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, user: cached });
    }

    const userIsAdmin = isAdmin(sessionRole);

    const result = await pool.query(
      `SELECT c.name as company_name, r.name as role_name, u.name as user_name,
              ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
       FROM users u
       JOIN companies c ON u.company_id = c.id
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
       LEFT JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1
       GROUP BY c.name, r.name, u.name`,
      [sessionUserId]
    );

    let companyName = '';
    let roleName = sessionRole;
    let userPermissions: string[] = userIsAdmin ? [...ALL_PERMISSION_NAMES] : ['view_dashboard'];

    if (result.rows.length > 0) {
      companyName = result.rows[0].company_name;
      if (result.rows[0].role_name) roleName = result.rows[0].role_name;
      if (!userIsAdmin) userPermissions = result.rows[0].permissions || ['view_dashboard'];
    }

    const user = {
      id: sessionUserId,
      name: request.headers.get('x-user-name') || result.rows[0]?.user_name || '',
      role: roleName,
      permissions: userPermissions,
      isAdmin: userIsAdmin,
      companyName,
      companyId: sessionCompanyId,
    };

    cache.set(cacheKey, user, 300); // 5 minutes

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
