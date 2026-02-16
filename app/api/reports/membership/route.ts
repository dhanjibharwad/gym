import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  try {
    // Check view_payments permission
    const { authorized, response } = await checkPermission(request, 'view_payments');
    if (!authorized) return response;

    const companyId = request.headers.get('x-company-id');
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period'); // today, week, month, 15days
    
    console.log('Membership API called with:', { startDate, endDate, period, companyId });

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
        dateFilter = `AND DATE(m.created_at) = CURRENT_DATE`;
        console.log('Applying today filter');
      } else if (period === 'week') {
        dateFilter = `AND m.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        console.log('Applying week filter');
      } else if (period === '15days') {
        dateFilter = `AND m.created_at >= CURRENT_DATE - INTERVAL '15 days'`;
        console.log('Applying 15 days filter');
      } else if (period === 'month') {
        dateFilter = `AND m.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
        console.log('Applying month filter');
      } else if (startDate && endDate) {
        dateFilter = `AND DATE(m.created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        dateParams.push(startDate, endDate);
        paramIndex += 2;
        console.log('Applying custom date range filter:', startDate, 'to', endDate);
      } else {
        console.log('No date filter applied');
      }

      // Fetch membership data with filters
      const query = `
        SELECT 
          m.id,
          m.member_id,
          mem.full_name,
          mem.phone_number,
          mem.email,
          mem.profile_photo_url,
          mp.plan_name,
          mp.duration_months,
          mp.price,
          m.start_date,
          m.end_date,
          m.status,
          m.created_at,
          p.total_amount,
          p.paid_amount,
          p.payment_status,
          p.payment_mode,
          CASE 
            WHEN m.status = 'active' THEN 'Active'
            WHEN m.status = 'expired' THEN 'Expired'
            WHEN m.status = 'cancelled' THEN 'Cancelled'
            WHEN m.status = 'on_hold' THEN 'On Hold'
            ELSE 'Unknown'
          END as status_label
        FROM memberships m
        JOIN members mem ON m.member_id = mem.id
        JOIN membership_plans mp ON m.plan_id = mp.id
        LEFT JOIN payments p ON m.id = p.membership_id
        WHERE mem.company_id = $1
        ${dateFilter}
        ORDER BY m.created_at DESC
      `;
      
      console.log('Executing query:', query);
      console.log('With parameters:', dateParams);
      
      const result = await client.query(query, dateParams);

      // Get summary statistics
      const summaryResult = await client.query(`
        SELECT 
          COUNT(*) as total_memberships,
          COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_memberships,
          COUNT(CASE WHEN m.status = 'expired' THEN 1 END) as expired_memberships,
          COUNT(CASE WHEN m.status = 'cancelled' THEN 1 END) as cancelled_memberships,
          COUNT(CASE WHEN m.status = 'on_hold' THEN 1 END) as hold_memberships,
          SUM(CASE WHEN m.status = 'active' THEN p.paid_amount ELSE 0 END) as collected_revenue,
          SUM(CASE WHEN m.status = 'active' THEN p.paid_amount ELSE 0 END) as collected_revenue
        FROM memberships m
        JOIN members mem ON m.member_id = mem.id
        JOIN membership_plans mp ON m.plan_id = mp.id
        LEFT JOIN payments p ON m.id = p.membership_id
        WHERE mem.company_id = $1
        ${dateFilter}
      `, dateParams);

      console.log('Query results count:', result.rows.length);
      console.log('Sample data:', result.rows.slice(0, 2));
      
      return NextResponse.json({
        success: true,
        memberships: result.rows,
        summary: summaryResult.rows[0] || {
          total_memberships: 0,
          active_memberships: 0,
          expired_memberships: 0,
          cancelled_memberships: 0,
          hold_memberships: 0,
          potential_revenue: 0,
          collected_revenue: 0
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Fetch membership reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch membership reports' },
      { status: 500 }
    );
  }
}