import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  try {
    // Check view_payments permission for overall reports
    const { authorized, response } = await checkPermission(request, 'view_payments');
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
        dateFilter = `AND DATE(created_at) = CURRENT_DATE`;
      } else if (period === 'week') {
        dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
      } else if (period === '15days') {
        dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '15 days'`;
      } else if (period === 'month') {
        dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
      } else if (startDate && endDate) {
        dateFilter = `AND DATE(created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        dateParams.push(startDate, endDate);
        paramIndex += 2;
      }

      // Test the database structure first
      try {
        const testResult = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'memberships' AND column_name = 'status'
        `);
        console.log('Status column exists:', testResult.rows);
      } catch (testError) {
        console.error('Database structure test failed:', testError);
      }

      // Get comprehensive overview data
      const overviewResult = await client.query(`
        SELECT 
          -- Membership Statistics
          (SELECT COUNT(*) FROM memberships m JOIN members mem ON m.member_id = mem.id WHERE mem.company_id = $1 ${dateFilter.replace('created_at', 'm.created_at')}) as total_memberships,
          (SELECT COUNT(*) FROM memberships m JOIN members mem ON m.member_id = mem.id WHERE mem.company_id = $1 AND m.status = 'active' ${dateFilter.replace('created_at', 'm.created_at')}) as active_memberships,
          (SELECT COUNT(*) FROM memberships m JOIN members mem ON m.member_id = mem.id WHERE mem.company_id = $1 AND m.status = 'expired' ${dateFilter.replace('created_at', 'm.created_at')}) as expired_memberships,
          
          -- Member Statistics
          (SELECT COUNT(*) FROM members WHERE company_id = $1 ${dateFilter.replace('created_at', 'created_at')}) as total_members,
          (SELECT COUNT(*) FROM members WHERE company_id = $1 ${dateFilter.replace('created_at', 'created_at')}) as active_members,
          
          -- Payment Statistics
          (SELECT COUNT(*) FROM payment_transactions pt JOIN memberships ms ON pt.membership_id = ms.id JOIN members mem ON pt.member_id = mem.id WHERE mem.company_id = $1 ${dateFilter.replace('created_at', 'pt.transaction_date')}) as total_transactions,
          (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions pt JOIN memberships ms ON pt.membership_id = ms.id JOIN members mem ON pt.member_id = mem.id WHERE mem.company_id = $1 AND pt.transaction_type != 'refund' ${dateFilter.replace('created_at', 'pt.transaction_date')}) as total_revenue,
          (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions pt JOIN memberships ms ON pt.membership_id = ms.id JOIN members mem ON pt.member_id = mem.id WHERE mem.company_id = $1 AND pt.transaction_type = 'refund' ${dateFilter.replace('created_at', 'pt.transaction_date')}) as total_refunds,
          
          -- Plan Statistics
          (SELECT COUNT(DISTINCT plan_id) FROM memberships m JOIN members mem ON m.member_id = mem.id WHERE mem.company_id = $1 ${dateFilter.replace('created_at', 'm.created_at')}) as active_plans
      `, dateParams.length > 1 ? [companyId, ...dateParams.slice(1)] : [companyId]);

      // Get recent activities
      const recentActivitiesResult = await client.query(`
        SELECT 
          'membership' as activity_type,
          m.id,
          mem.full_name,
          mp.plan_name,
          m.status,
          m.created_at as activity_date,
          'New membership created' as description
        FROM memberships m
        JOIN members mem ON m.member_id = mem.id
        JOIN membership_plans mp ON m.plan_id = mp.id
        WHERE mem.company_id = $1
        ${dateFilter.replace('created_at', 'm.created_at')}
        
        UNION ALL
        
        SELECT 
          'payment' as activity_type,
          pt.id,
          mem.full_name,
          mp.plan_name,
          pt.transaction_type as status,
          pt.transaction_date as activity_date,
          CONCAT('Payment of ₹', pt.amount, ' via ', pt.payment_mode) as description
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members mem ON pt.member_id = mem.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        WHERE mem.company_id = $1
        ${dateFilter.replace('created_at', 'pt.transaction_date')}
        
        ORDER BY activity_date DESC
        LIMIT 20
      `, dateParams.length > 1 ? [companyId, ...dateParams.slice(1)] : [companyId]);

      // Get membership status distribution
      const statusDistributionResult = await client.query(`
        SELECT 
          m.status,
          COUNT(*) as count,
          CASE 
            WHEN m.status = 'active' THEN 'Active'
            WHEN m.status = 'expired' THEN 'Expired'
            WHEN m.status = 'cancelled' THEN 'Cancelled'
            WHEN m.status = 'on_hold' THEN 'On Hold'
            ELSE 'Unknown'
          END as status_label
        FROM memberships m
        JOIN members mem ON m.member_id = mem.id
        WHERE mem.company_id = $1
        ${dateFilter.replace('created_at', 'm.created_at')}
        GROUP BY m.status
        ORDER BY count DESC
      `, dateParams.length > 1 ? [companyId, ...dateParams.slice(1)] : [companyId]);

      // Get plan popularity
      const planPopularityResult = await client.query(`
        SELECT 
          mp.plan_name,
          mp.price,
          COUNT(m.id) as membership_count,
          SUM(CASE WHEN m.status = 'active' THEN mp.price ELSE 0 END) as potential_revenue
        FROM memberships m
        JOIN members mem ON m.member_id = mem.id
        JOIN membership_plans mp ON m.plan_id = mp.id
        WHERE mem.company_id = $1
        ${dateFilter.replace('created_at', 'm.created_at')}
        GROUP BY mp.plan_name, mp.price
        ORDER BY membership_count DESC
      `, dateParams.length > 1 ? [companyId, ...dateParams.slice(1)] : [companyId]);

      return NextResponse.json({
        success: true,
        overview: overviewResult.rows[0] || {
          total_memberships: 0,
          active_memberships: 0,
          expired_memberships: 0,
          total_members: 0,
          active_members: 0,
          total_transactions: 0,
          total_revenue: 0,
          total_refunds: 0,
          active_plans: 0
        },
        recent_activities: recentActivitiesResult.rows,
        status_distribution: statusDistributionResult.rows,
        plan_popularity: planPopularityResult.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch overall reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch overall reports' },
      { status: 500 }
    );
  }
}