import { NextRequest, NextResponse } from 'next/server';
import { dashboardOps } from '@/lib/optimized-queries';
import { checkPermission } from '@/lib/api-permissions';

/**
 * OPTIMIZED DASHBOARD STATS API
 * 
 * Fetches all dashboard statistics in a SINGLE database query
 * with intelligent caching (2 minute TTL)
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Check view_dashboard permission
    const { authorized, response } = await checkPermission(request, 'view_dashboard');
    if (!authorized) return response;

    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse optional date filter parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const birthdayFilter = parseInt(searchParams.get('birthdayFilter') || '30');
    
    // Use optimized single-query approach with caching (5 minutes for ultra-fast response)
    const stats = await dashboardOps.getDashboardStats(
      parseInt(companyId),
      { cacheTTL: 300, useCache: true } // Cache for 5 minutes
    );

    // If date filters are applied, fetch filtered data separately
    let filteredStats = stats;
    if (startDate && endDate) {
      const filterStartTime = Date.now();
      filteredStats = await getFilteredDashboardStats(
        parseInt(companyId),
        startDate,
        endDate,
        birthdayFilter
      );
      console.log(`[Dashboard API] Filter query took: ${Date.now() - filterStartTime}ms`);
    }

    // Ensure proper serialization of all values
    const serializedStats = {
      total_members: parseInt((filteredStats as any).total_members) || 0,
      new_today: parseInt((filteredStats as any).new_today) || 0,
      expiring_week: parseInt((filteredStats as any).expiring_week) || 0,
      today_revenue: parseFloat((filteredStats as any).today_revenue) || 0,
      monthly_revenue: parseFloat((filteredStats as any).monthly_revenue) || 0,
      total_revenue: parseFloat((filteredStats as any).total_revenue) || 0,
      pending_payments: parseInt((filteredStats as any).pending_payments) || 0,
      recent_members_list: (filteredStats as any).recent_members_list ? 
        (typeof (filteredStats as any).recent_members_list === 'string' ? 
          JSON.parse((filteredStats as any).recent_members_list) : 
          (filteredStats as any).recent_members_list) : [],
      upcoming_birthdays_list: (filteredStats as any).upcoming_birthdays_list ? 
        (typeof (filteredStats as any).upcoming_birthdays_list === 'string' ? 
          JSON.parse((filteredStats as any).upcoming_birthdays_list) : 
          (filteredStats as any).upcoming_birthdays_list) : []
    };

    const endTime = Date.now();
    console.log(`[Dashboard API] Total response time: ${endTime - startTime}ms`);

    return NextResponse.json({
      success: true,
      stats: serializedStats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard stats', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get filtered dashboard stats when date range is specified
 * (Less caching since it's user-specific)
 */
async function getFilteredDashboardStats(
  companyId: number,
  startDate: string,
  endDate: string,
  birthdayFilter: number
) {
  const pool = (await import('@/lib/db')).default;
  
  const query = `
    WITH member_stats AS (
      SELECT 
        COUNT(*) as total_members,
        COUNT(*) FILTER (WHERE created_at >= $2 AND created_at <= $3) as new_in_range,
        COUNT(*) FILTER (WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as expiring_week
      FROM members m
      LEFT JOIN LATERAL (
        SELECT end_date FROM memberships 
        WHERE member_id = m.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) ms ON true
      WHERE m.company_id = $1
    ),
    payment_stats AS (
      SELECT 
        SUM(paid_amount) FILTER (WHERE created_at >= $2 AND created_at <= $3) as revenue_in_range,
        SUM(paid_amount) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
        SUM(paid_amount) as total_revenue,
        COUNT(*) FILTER (WHERE payment_status IN ('pending', 'partial')) as pending_payments
      FROM payments p
      JOIN memberships ms ON p.membership_id = ms.id
      JOIN members m ON ms.member_id = m.id
      WHERE m.company_id = $1
    ),
    recent_members AS (
      SELECT 
        m.id,
        m.full_name,
        m.profile_photo_url,
        mp.plan_name,
        m.created_at,
        ms.status as membership_status
      FROM members m
      LEFT JOIN LATERAL (
        SELECT plan_id, status, created_at FROM memberships 
        WHERE member_id = m.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) ms ON true
      LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
      WHERE m.company_id = $1
        AND m.created_at >= $2 AND m.created_at <= $3
      ORDER BY m.created_at DESC
      LIMIT 5
    ),
    upcoming_birthdays AS (
      SELECT 
        id,
        full_name,
        profile_photo_url,
        date_of_birth,
        EXTRACT(DAY FROM (INTERVAL '1 year' + date_of_birth - CURRENT_DATE)) % 365 as days_until_birthday,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) + 1 as turning_age
      FROM members
      WHERE company_id = $1 
        AND date_of_birth IS NOT NULL
        AND EXTRACT(DAY FROM (INTERVAL '1 year' + date_of_birth - CURRENT_DATE)) % 365 <= $4
      ORDER BY days_until_birthday
      LIMIT 5
    )
    SELECT 
      ms.total_members,
      ms.new_in_range as new_today,
      ms.expiring_week,
      ps.revenue_in_range as today_revenue,
      ps.monthly_revenue,
      ps.total_revenue,
      ps.pending_payments,
      (SELECT json_agg(recent_members) FROM recent_members) as recent_members_list,
      (SELECT json_agg(upcoming_birthdays) FROM upcoming_birthdays) as upcoming_birthdays_list
    FROM member_stats ms, payment_stats ps
  `;

  const result = await pool.query(query, [companyId, startDate, endDate, birthdayFilter]);
  const row = result.rows[0];
  
  // Ensure proper serialization of all values - handle both string and object JSON
  return {
    total_members: parseInt((row as any).total_members) || 0,
    new_today: parseInt((row as any).new_today) || 0,
    expiring_week: parseInt((row as any).expiring_week) || 0,
    today_revenue: parseFloat((row as any).revenue_in_range) || 0,
    monthly_revenue: parseFloat((row as any).monthly_revenue) || 0,
    total_revenue: parseFloat((row as any).total_revenue) || 0,
    pending_payments: parseInt((row as any).pending_payments) || 0,
    recent_members_list: (row as any).recent_members_list ? 
      (typeof (row as any).recent_members_list === 'string' ? 
        JSON.parse((row as any).recent_members_list) : 
        (row as any).recent_members_list) : [],
    upcoming_birthdays_list: (row as any).upcoming_birthdays_list ? 
      (typeof (row as any).upcoming_birthdays_list === 'string' ? 
        JSON.parse((row as any).upcoming_birthdays_list) : 
        (row as any).upcoming_birthdays_list) : []
  };
}
