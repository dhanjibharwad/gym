import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // Fetch payments with member and membership details
      const result = await client.query(`
        SELECT 
          p.id,
          p.membership_id,
          p.total_amount,
          p.paid_amount,
          p.payment_mode,
          p.payment_status,
          p.next_due_date,
          p.created_at,
          m.id as member_id,
          m.full_name,
          m.phone_number,
          m.profile_photo_url,
          ms.start_date,
          ms.end_date,
          ms.created_by,
          mp.plan_name
        FROM payments p
        JOIN memberships ms ON p.membership_id = ms.id
        JOIN members m ON ms.member_id = m.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        ORDER BY p.created_at DESC
      `);
      
      // Convert numeric fields to numbers
      const paymentsWithNumbers = result.rows.map(payment => ({
        ...payment,
        total_amount: parseFloat(payment.total_amount) || 0,
        paid_amount: parseFloat(payment.paid_amount) || 0
      }));
      
      console.log('Payments query result:', result.rows.length, 'rows');
      if (result.rows.length > 0) {
        console.log('Sample payment:', paymentsWithNumbers[0]);
        const totalRevenue = paymentsWithNumbers.reduce((sum, payment) => sum + payment.paid_amount, 0);
        console.log('Total revenue calculated:', totalRevenue);
      }
      
      return NextResponse.json({
        success: true,
        payments: paymentsWithNumbers
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}