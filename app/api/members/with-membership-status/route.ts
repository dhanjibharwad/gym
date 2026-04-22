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
            WHEN membership.id IS NULL THEN 'none'
            WHEN membership.end_date >= CURRENT_DATE THEN 'active'
            ELSE 'expired'
          END as membership_status,
          membership.plan_name,
          membership.start_date,
          membership.end_date,
          membership.trainer_assigned,
          membership.batch_time
        FROM members m
        LEFT JOIN (
          SELECT 
            ms.id,
            ms.member_id,
            ms.plan_id,
            ms.start_date,
            ms.end_date,
            ms.trainer_assigned,
            ms.batch_time,
            mp.plan_name,
            ROW_NUMBER() OVER (PARTITION BY ms.member_id ORDER BY ms.created_at DESC) as rn
          FROM memberships ms
          JOIN membership_plans mp ON ms.plan_id = mp.id
          WHERE mp.company_id = $1
        ) membership ON m.id = membership.member_id AND membership.rn = 1
        WHERE m.company_id = $1 AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
      `, [session.user.companyId]);

      return NextResponse.json({
        success: true,
        members: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching members with membership status:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching members' },
      { status: 500 }
    );
  }
}
