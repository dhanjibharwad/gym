import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  try {
    // Check view_revenue permission
    const { authorized, response } = await checkPermission(request, 'view_revenue');
    if (!authorized) return response;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period');
    const companyId = request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Build date filter
      let dateFilter = '';
      let dateParams: any[] = [companyId];
      let paramIndex = 2;

      if (period === 'today') {
        dateFilter = `AND DATE(pt.transaction_date) = CURRENT_DATE`;
      } else if (period === 'week') {
        dateFilter = `AND pt.transaction_date >= CURRENT_DATE - INTERVAL '7 days'`;
      } else if (period === '15days') {
        dateFilter = `AND pt.transaction_date >= CURRENT_DATE - INTERVAL '15 days'`;
      } else if (period === 'month') {
        dateFilter = `AND pt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'`;
      } else if (startDate && endDate) {
        dateFilter = `AND DATE(pt.transaction_date) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        dateParams.push(startDate, endDate);
        paramIndex += 2;
      }

      // Fetch revenue data with daily breakdown
      const dailyRevenueResult = await client.query(`
        SELECT 
          DATE(pt.transaction_date) as date,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN pt.transaction_type != 'refund' THEN pt.amount ELSE 0 END) as daily_income,
          SUM(CASE WHEN pt.transaction_type = 'refund' THEN pt.amount ELSE 0 END) as daily_refunds,
          SUM(pt.amount) as net_daily_amount
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter}
        GROUP BY DATE(pt.transaction_date)
        ORDER BY DATE(pt.transaction_date) DESC
      `, dateParams);

      // Get revenue summary statistics
      const summaryResult = await client.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN pt.transaction_type != 'refund' THEN pt.amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN pt.transaction_type = 'refund' THEN pt.amount ELSE 0 END) as total_refunds,
          SUM(pt.amount) as net_revenue,
          AVG(CASE WHEN pt.transaction_type != 'refund' THEN pt.amount ELSE NULL END) as average_transaction_value,
          COUNT(DISTINCT pt.member_id) as unique_customers,
          COUNT(DISTINCT DATE(pt.transaction_date)) as active_days
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter}
      `, dateParams);

      // Get top revenue-generating members
      const topMembersResult = await client.query(`
        SELECT 
          mem.id,
          mem.full_name,
          mem.phone_number,
          mem.profile_photo_url,
          COUNT(pt.id) as transaction_count,
          SUM(pt.amount) as total_spent
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter}
        GROUP BY mem.id, mem.full_name, mem.phone_number, mem.profile_photo_url
        ORDER BY total_spent DESC
        LIMIT 10
      `, dateParams);

      // Get plan-wise revenue breakdown
      const planBreakdownResult = await client.query(`
        SELECT 
          mp.plan_name,
          mp.price,
          COUNT(DISTINCT ms.id) as membership_count,
          SUM(CASE WHEN pt.transaction_type != 'refund' THEN pt.amount ELSE 0 END) as plan_revenue
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        JOIN members mem ON pt.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter}
        GROUP BY mp.plan_name, mp.price
        ORDER BY plan_revenue DESC
      `, dateParams);

      return NextResponse.json({
        success: true,
        daily_revenue: dailyRevenueResult.rows,
        summary: summaryResult.rows[0] || {
          total_transactions: 0,
          total_revenue: 0,
          total_refunds: 0,
          net_revenue: 0,
          average_transaction_value: 0,
          unique_customers: 0,
          active_days: 0
        },
        top_members: topMembersResult.rows,
        plan_breakdown: planBreakdownResult.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch revenue reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch revenue reports' },
      { status: 500 }
    );
  }
}