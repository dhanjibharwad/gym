import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('membership_id');
    const companyId = request.headers.get('x-company-id');
    
    if (!membershipId) {
      return NextResponse.json(
        { success: false, message: 'Membership ID is required' },
        { status: 400 }
      );
    }
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
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
          pt.description,
          p.reference_number
        FROM payment_transactions pt
        LEFT JOIN payments p ON pt.membership_id = p.membership_id
        JOIN memberships m ON pt.membership_id = m.id
        JOIN members mem ON m.member_id = mem.id
        WHERE pt.membership_id = $1 AND mem.company_id = $2
        ORDER BY transaction_date ASC, created_at ASC
      `, [membershipId, companyId]);
      
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