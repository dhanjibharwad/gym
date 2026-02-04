import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      'SELECT id, name, email, role, is_verified, created_at FROM users WHERE role IN ($1, $2) ORDER BY role DESC, created_at DESC',
      ['admin', 'reception']
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