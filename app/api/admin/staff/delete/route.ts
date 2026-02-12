import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { isAdmin } from '@/lib/rbac';

export async function DELETE(req: NextRequest) {
  try {
    // Check delete_staff permission
    const auth = await checkPermission(req, 'delete_staff');
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (parseInt(staffId) === auth.session!.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if target user is an admin - prevent deleting admins
    const targetUser = await pool.query(
      `SELECT u.id, u.name, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1 AND u.company_id = $2`,
      [staffId, auth.session!.user.companyId]
    );

    if (targetUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Prevent deleting admin users
    if (isAdmin(targetUser.rows[0].role_name)) {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete staff member
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING id, name',
      [staffId, auth.session!.user.companyId]
    );

    return NextResponse.json({ 
      message: `Staff member "${result.rows[0].name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}