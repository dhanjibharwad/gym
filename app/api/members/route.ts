import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAnyPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    // Check view_members or add_members permission
    const auth = await checkAnyPermission(request, ['view_members', 'add_members', 'edit_members']);
    if (!auth.authorized) {
      return auth.response;
    }
    
    const companyId = auth.session!.user.companyId;
    
    client = await pool.connect();
    
    // Get members data with their latest membership status and payment info - FILTERED BY COMPANY
    const result = await client.query(`
      SELECT 
        m.*,
        ms.status as membership_status,
        ms.start_date,
        ms.end_date,
        mp.plan_name,
        p.total_amount,
        p.paid_amount,
        p.payment_mode,
        p.payment_status
      FROM members m
      LEFT JOIN LATERAL (
        SELECT ms.status, ms.start_date, ms.end_date, ms.plan_id, ms.id as membership_id
        FROM memberships ms
        WHERE ms.member_id = m.id
        ORDER BY ms.created_at DESC
        LIMIT 1
      ) ms ON true
      LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
      LEFT JOIN payments p ON p.membership_id = ms.membership_id
      WHERE m.company_id = $1
      ORDER BY m.created_at DESC
    `, [companyId]);
    
    return NextResponse.json({
      success: true,
      members: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database connection failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}