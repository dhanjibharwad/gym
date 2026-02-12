import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check edit_staff permission
    const { authorized, response, session } = await checkPermission(request, 'edit_staff');
    if (!authorized) return response;

    const { id: staffId } = await params;
    const body = await request.json();
    const { name, email, role_id } = body;
    const companyId = request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID required' },
        { status: 400 }
      );
    }

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if staff member exists and belongs to company
      const checkResult = await client.query(
        `SELECT u.*, r.name as role_name 
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1 AND u.company_id = $2`,
        [staffId, companyId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Staff member not found' },
          { status: 404 }
        );
      }

      const staffMember = checkResult.rows[0];

      // Prevent editing admin users
      if (staffMember.role_name?.toLowerCase() === 'admin') {
        return NextResponse.json(
          { success: false, error: 'Cannot edit admin users' },
          { status: 403 }
        );
      }

      // Check if email already exists for another user
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2 AND company_id = $3',
        [email, staffId, companyId]
      );

      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Email already in use by another user' },
          { status: 400 }
        );
      }

      // Update staff member
      const updateResult = await client.query(
        `UPDATE users 
         SET name = $1, email = $2, role_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND company_id = $5
         RETURNING id, name, email, role_id, is_verified, created_at`,
        [name, email, role_id || null, staffId, companyId]
      );

      return NextResponse.json({
        success: true,
        staff: updateResult.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}
