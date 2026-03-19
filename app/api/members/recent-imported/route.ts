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
      // Get members who were recently imported (no membership yet)
      // and order by creation date to get the most recent imports
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
