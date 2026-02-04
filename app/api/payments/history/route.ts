import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          pt.id,
          pt.member_id,
          pt.membership_id,
          pt.transaction_type,
          pt.amount,
          pt.payment_mode,
          pt.transaction_date,
          pt.receipt_number,
          pt.created_by,
          pt.created_at,
          m.full_name,
          m.phone_number,
          m.profile_photo_url,
          mp.plan_name,
          p.total_amount,
          p.paid_amount,
          p.payment_status
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members m ON pt.member_id = m.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        JOIN payments p ON pt.membership_id = p.membership_id
        ORDER BY pt.transaction_date DESC, pt.created_at DESC
      `);
      
      return NextResponse.json({
        success: true,
        transactions: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch payment history error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}