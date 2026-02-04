import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    // Check if any admin exists in the new structure
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'Admin'
    `);

    const adminExists = parseInt(result.rows[0].count, 10) > 0;

    return NextResponse.json({
      adminExists,
      needsSetup: !adminExists
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { error: 'Setup check failed' },
      { status: 500 }
    );
  }
}
