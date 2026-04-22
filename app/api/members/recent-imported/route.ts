import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionFromRequest } from '@/lib/session-utils';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session?.user?.companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          m.id,
          m.member_number,
          m.full_name,
          m.phone_number,
          m.email,
          m.created_at,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM memberships WHERE member_id = m.id
            ) THEN true 
            ELSE false 
          END as has_membership
        FROM members m
        WHERE m.company_id = $1
          AND m.deleted_at IS NULL
          AND m.created_at > NOW() - INTERVAL '24 hours'
        ORDER BY m.created_at DESC
        LIMIT 100
      `, [session.user.companyId]);

      return NextResponse.json({
        success: true,
        members: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching recent imported members:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching imported members' },
      { status: 500 }
    );
  }
}
