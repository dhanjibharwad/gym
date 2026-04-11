import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { companyId, newPassword } = await request.json();

    if (!companyId || !newPassword || newPassword.trim().length < 6) {
      return NextResponse.json(
        { error: 'Company ID and password (min 6 chars) are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE users SET password = $1
       WHERE company_id = $2
         AND role_id = (SELECT id FROM roles WHERE company_id = $2 AND name = 'Admin' LIMIT 1)
       RETURNING id, name, email`,
      [newPassword.trim(), companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Admin user not found for this company' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${result.rows[0].name}`,
      admin: { name: result.rows[0].name, email: result.rows[0].email }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
