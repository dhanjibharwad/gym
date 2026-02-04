import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    
    if (!memberId) {
      return NextResponse.json(
        { success: false, message: 'Member ID is required' },
        { status: 400 }
      );
    }

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
          (
            SELECT COALESCE(SUM(pt2.amount), 0)
            FROM payment_transactions pt2 
            WHERE pt2.membership_id = pt.membership_id 
            AND pt2.transaction_date <= pt.transaction_date
            AND pt2.id <= pt.id
          ) as cumulative_paid,
          p.payment_status
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members m ON pt.member_id = m.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        JOIN payments p ON pt.membership_id = p.membership_id
        WHERE pt.member_id = $1
        ORDER BY pt.transaction_date DESC, pt.created_at DESC
      `, [memberId]);
      
      const transactionsWithNumbers = result.rows.map(transaction => ({
        ...transaction,
        amount: parseFloat(transaction.amount) || 0,
        total_amount: parseFloat(transaction.total_amount) || 0,
        cumulative_paid: parseFloat(transaction.cumulative_paid) || 0,
        remaining_amount: (parseFloat(transaction.total_amount) || 0) - (parseFloat(transaction.cumulative_paid) || 0)
      }));
      
      return NextResponse.json({
        success: true,
        transactions: transactionsWithNumbers
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch member history error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch member history' },
      { status: 500 }
    );
  }
}