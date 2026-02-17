import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Get query parameters
      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period') || 'month';
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      
      console.log('Payment API called with:', { companyId, period, startDate, endDate });
      
      // Build consistent date filter for payment_transactions table
      let dateFilter = '';
      let dateParams: string[] = [companyId];
      let paramIndex = 2;
      
      if (period === 'today') {
        dateFilter = 'AND DATE(pt.transaction_date) = CURRENT_DATE';
      } else if (period === 'week') {
        dateFilter = 'AND pt.transaction_date >= CURRENT_DATE - INTERVAL \'7 days\'';
      } else if (period === '15days') {
        dateFilter = 'AND pt.transaction_date >= CURRENT_DATE - INTERVAL \'15 days\'';
      } else if (period === 'month') {
        dateFilter = 'AND pt.transaction_date >= CURRENT_DATE - INTERVAL \'30 days\'';
      } else if (startDate && endDate) {
        dateFilter = `AND DATE(pt.transaction_date) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        dateParams.push(startDate, endDate);
        paramIndex += 2;
      }
      
      console.log('Date filter:', dateFilter);
      console.log('Date params:', dateParams);
      console.log('Param index:', paramIndex);
      
      // Fetch payment transactions with consistent filtering
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
          mem.full_name,
          mem.phone_number,
          mem.profile_photo_url,
          mp.plan_name,
          ms.status as membership_status,
          p.total_amount,
          p.paid_amount,
          p.payment_status,
          CASE 
            WHEN pt.transaction_type = 'initial_payment' THEN 'Initial Payment'
            WHEN pt.transaction_type = 'additional_payment' THEN 'Additional Payment'
            WHEN pt.transaction_type = 'renewal_payment' THEN 'Renewal Payment'
            WHEN pt.transaction_type = 'refund' THEN 'Refund'
            ELSE pt.transaction_type
          END as transaction_type_label
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        JOIN payments p ON pt.membership_id = p.membership_id
        WHERE mem.company_id = $1
        ${dateFilter}
        ORDER BY pt.transaction_date DESC, pt.created_at DESC
      `, dateParams);
      
      console.log('Payment transactions query result:', result.rows.length, 'rows');
      console.log('Sample rows:', result.rows.slice(0, 2));
      
      // Fetch payment summary from the same consistent data source
      const summaryResult = await client.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(pt.amount) as total_income,
          (
            SELECT COALESCE(SUM(p.total_amount - p.paid_amount), 0)
            FROM payments p
            JOIN memberships ms ON p.membership_id = ms.id
            JOIN members mem ON ms.member_id = mem.id
            WHERE mem.company_id = $1
            AND p.payment_status IN ('pending', 'partial')
          ) as pending_amount,
          (
            SELECT COUNT(*)
            FROM payments p
            JOIN memberships ms ON p.membership_id = ms.id
            JOIN members mem ON ms.member_id = mem.id
            WHERE mem.company_id = $1
            AND p.payment_status IN ('pending', 'partial')
          ) as pending_count
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter}
      `, dateParams);
      
      console.log('Summary result:', summaryResult.rows[0]);
      
      // Get payment mode breakdown (consistent with main query)
      const modeBreakdownResult = await client.query(`
        SELECT 
          pt.payment_mode,
          COUNT(*) as transaction_count,
          SUM(pt.amount) as total_amount
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter}
        GROUP BY pt.payment_mode
        ORDER BY total_amount DESC
      `, dateParams);
      
      console.log('Mode breakdown result:', modeBreakdownResult.rows);
      
      return NextResponse.json({
        success: true,
        payments: result.rows,
        summary: summaryResult.rows[0] || {
          total_transactions: 0,
          total_income: 0,
          pending_amount: 0,
          pending_count: 0
        },
        mode_breakdown: modeBreakdownResult.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch payment reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment reports', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}