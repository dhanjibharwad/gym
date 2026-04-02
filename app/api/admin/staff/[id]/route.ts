import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { sendStaffEmail } from '@/lib/staff-email';
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, session } = await checkPermission(request, 'edit_staff');
    if (!authorized) return response;

    const { id: staffId } = await params;
    const { password } = await request.json();

    if (!password || !password.trim()) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const companyId = session!.user.companyId;

    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3 RETURNING id, name, email`,
      [password.trim(), staffId, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    // Invalidate cache
    const { cache } = await import('@/lib/cache/MemoryCache');
    cache.delete(`staff:list:v2:${companyId}`);

    const loginUrl = process.env.NEXTAUTH_URL || 'http://localhost:8004';
    const { sent: emailSent } = await sendStaffEmail(
      companyId,
      result.rows[0].email,
      'Your Password Has Been Reset',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#ea580c">Password Reset</h2>
        <p>Hello ${result.rows[0].name},</p>
        <p>Your password has been reset. New credentials:</p>
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
          <p><strong>Login URL:</strong> <a href="${loginUrl}/auth/login">${loginUrl}/auth/login</a></p>
          <p><strong>Email:</strong> ${result.rows[0].email}</p>
          <p><strong>Password:</strong> <code style="background:#e5e7eb;padding:4px 8px;border-radius:4px">${password.trim()}</code></p>
        </div>
        <p>Best regards,<br>Gym Management Team</p>
      </div>`
    );

    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

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
