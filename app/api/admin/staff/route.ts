import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAnyPermission } from '@/lib/api-permissions';
import { cache } from '@/lib/cache/MemoryCache';

export async function GET(request: NextRequest) {
  try {
    // Check permission: view_staff or add_staff or delete_staff or edit_staff or manage_roles
    const auth = await checkAnyPermission(request, ['view_staff', 'add_staff', 'delete_staff', 'edit_staff', 'manage_roles']);
    if (!auth.authorized) {
      return auth.response;
    }

    const companyId = auth.session!.user.companyId;
    
    // Check cache first
    const cacheKey = `staff:list:v2:${companyId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[Staff API] ✅ Cache HIT for company ${companyId}`);
      return NextResponse.json({ staff: cached });
    }
    
    console.log(`[Staff API] ❌ Cache MISS for company ${companyId}, fetching from DB...`);

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password, r.name as role, r.id as role_id, u.is_verified, u.created_at 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`,
      [companyId]
    );

    // Cache for 5 minutes
    cache.set(cacheKey, result.rows, 300);
    console.log(`[Staff API] ✅ Cached ${result.rows.length} staff members`);

    return NextResponse.json({ staff: result.rows });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}