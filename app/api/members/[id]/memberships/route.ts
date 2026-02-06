import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const companyId = session?.user?.companyId || 1;
    const { id: memberId } = await params;

    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT 
          m.id,
          mp.plan_name,
          m.start_date,
          m.end_date,
          m.status,
          mp.price
        FROM memberships m
        JOIN membership_plans mp ON m.plan_id = mp.id
        JOIN members mem ON m.member_id = mem.id
        WHERE mem.id = $1 AND mem.company_id = $2
        ORDER BY m.created_at DESC
      `, [memberId, companyId]);

      return NextResponse.json({
        success: true,
        memberships: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching membership history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch membership history' },
      { status: 500 }
    );
  }
}
