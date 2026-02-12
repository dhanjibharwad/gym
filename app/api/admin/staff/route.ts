import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAnyPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  try {
    // Check permission: view_staff or add_staff or delete_staff or edit_staff or manage_roles
    const auth = await checkAnyPermission(request, ['view_staff', 'add_staff', 'delete_staff', 'edit_staff', 'manage_roles']);
    if (!auth.authorized) {
      return auth.response;
    }

    const companyId = auth.session!.user.companyId;

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, r.name as role, r.id as role_id, u.is_verified, u.created_at 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`,
      [companyId]
    );

    return NextResponse.json({ staff: result.rows });
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}