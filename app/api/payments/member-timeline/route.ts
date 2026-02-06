import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('membership_id');
    
    if (!membershipId) {
      return NextResponse.json(
        { success: false, message: 'Membership ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          pt.id,
          pt.transaction_type,
          pt.amount,
          pt.payment_mode,
          pt.transaction_date,
          pt.receipt_number,
          pt.created_by,
          pt.created_at,
          pt.description
        FROM payment_transactions pt
        WHERE pt.membership_id = $1 AND pt.transaction_type != 'membership_fee'
        
        UNION ALL
        
        SELECT 
          p.id,
          'membership_fee' as transaction_type,
          p.paid_amount as amount,
          p.payment_mode,
          p.created_at as transaction_date,
          p.reference_number as receipt_number,
          u.name as created_by,
          p.created_at,
          NULL as description
        FROM payments p
        JOIN memberships ms ON p.membership_id = ms.id
        LEFT JOIN users u ON ms.created_by = u.id
        WHERE p.membership_id = $1 AND p.paid_amount > 0
        
        ORDER BY transaction_date ASC, created_at ASC
      `, [membershipId]);
      
      return NextResponse.json({
        success: true,
        transactions: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch member timeline error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch member timeline' },
      { status: 500 }
    );
  }
}