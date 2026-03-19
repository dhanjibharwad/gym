import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          m.id,
          m.member_number,
          m.full_name,
          m.phone_number,
          m.email,
          m.created_at,
          false as has_membership
        FROM members m
        WHERE m.company_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM memberships ms WHERE ms.member_id = m.id
          )
        ORDER BY m.created_at DESC
        LIMIT 500`,
        [session.user.companyId]
      );

      return NextResponse.json({
        success: true,
        members: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching members without membership:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching members without membership' },
      { status: 500 }
    );
  }
}
