/**
 * Cache Warming Utility
 * 
 * Pre-loads frequently accessed data into cache on application startup
 * This ensures the first user request is instant (no cold start delay)
 */

import { cache } from './cache/MemoryCache';
import pool from './db';

interface CompanyData {
  id: number;
  name: string;
}

/**
 * Warm up cache for all active companies
 * Call this on application startup
 */
export async function warmUpGlobalCache(): Promise<void> {
  try {
    const companies = await getActiveCompanies();
    
    if (companies.length === 0) {
      return;
    }
    
    // Warm up data for each company sequentially
    for (const company of companies) {
      await warmUpCompanyData(company);
    }
  } catch (error) {
    // Silent fail - won't break app startup
  }
}

/**
 * Get all active companies
 */
async function getActiveCompanies(): Promise<CompanyData[]> {
  try {
    const result = await pool.query(
      'SELECT id, name FROM companies WHERE status = $1 AND is_active = $2',
      ['approved', true]
    );
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return [];
  }
}

/**
 * Warm up data for a single company
 */
async function warmUpCompanyData(company: CompanyData): Promise<void> {
  const companyId = company.id;
  
  try {
    // Sequential fetch to avoid overwhelming database (better for connection pool)
    await warmUpMembershipPlans(companyId);
    await warmUpSettings(companyId);
    await warmUpStaff(companyId);
    await warmUpDashboardStats(companyId);
    await warmUpReports(companyId);
  } catch (error) {
    // Silently fail - will be cached on first request
  }
}

/**
 * Warm up membership plans
 */
async function warmUpMembershipPlans(companyId: number) {
  try {
    const cacheKey = `membership-plans:${companyId}`;
    
    // Skip if already cached
    if (cache.get(cacheKey)) {
      return;
    }
    
    const result = await pool.query(
      `SELECT id, plan_name, duration_months, price, base_duration_months, base_price, created_at
       FROM membership_plans
       WHERE company_id = $1
       ORDER BY duration_months ASC`,
      [companyId]
    );
    
    cache.set(cacheKey, result.rows, 300);
  } catch (error) {
    // Silently fail - will be cached on first request
  }
}

/**
 * Warm up settings
 */
async function warmUpSettings(companyId: number) {
  try {
    const cacheKey = `settings:${companyId}`;
    
    // Skip if already cached
    if (cache.get(cacheKey)) {
      return;
    }
    
    const result = await pool.query(
      'SELECT payment_modes FROM settings WHERE company_id = $1',
      [companyId]
    );
    
    const paymentModes = result.rows[0]?.payment_modes || {
      Cash: { enabled: true, processingFee: 0 },
      UPI: { enabled: true, processingFee: 1.5 },
      Card: { enabled: true, processingFee: 2.5 },
      Online: { enabled: true, processingFee: 2.0 },
      Cheque: { enabled: true, processingFee: 0 }
    };
    
    cache.set(cacheKey, { success: true, settings: { paymentModes } }, 600);
  } catch (error) {
    // Silently fail - will be cached on first request
  }
}

/**
 * Warm up staff list
 */
async function warmUpStaff(companyId: number) {
  try {
    const cacheKey = `staff:list:${companyId}`;
    
    // Skip if already cached
    if (cache.get(cacheKey)) {
      return;
    }
    
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, r.name as role, r.id as role_id, u.is_verified, u.created_at 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`,
      [companyId]
    );
    
    cache.set(cacheKey, result.rows, 300);
  } catch (error) {
    // Silently fail - will be cached on first request
  }
}

/**
 * Warm up dashboard stats
 */
async function warmUpDashboardStats(companyId: number) {
  try {
    const cacheKey = `dashboard:stats:${companyId}`;
    
    // Skip if already cached
    if (cache.get(cacheKey)) {
      return;
    }
    
    // Use the same query as dashboardOps.getDashboardStats
    const query = `
      WITH member_stats AS (
        SELECT 
          COUNT(*) as total_members,
          COUNT(*) FILTER (WHERE m.created_at >= CURRENT_DATE) as new_today,
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
          SUM(paid_amount) FILTER (WHERE p.created_at >= CURRENT_DATE) as today_revenue,
          SUM(paid_amount) FILTER (WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
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
          ORDER BY memberships.created_at DESC 
          LIMIT 1
        ) ms ON true
        LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
        WHERE m.company_id = $1
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
          AND EXTRACT(DAY FROM (INTERVAL '1 year' + date_of_birth - CURRENT_DATE)) % 365 <= 30
        ORDER BY days_until_birthday
        LIMIT 5
      )
      SELECT 
        ms.total_members,
        ms.new_today,
        ms.expiring_week,
        ps.today_revenue,
        ps.monthly_revenue,
        ps.total_revenue,
        ps.pending_payments,
        (SELECT json_agg(recent_members) FROM recent_members) as recent_members_list,
        (SELECT json_agg(upcoming_birthdays) FROM upcoming_birthdays) as upcoming_birthdays_list
      FROM member_stats ms, payment_stats ps
    `;
    
    const result = await pool.query(query, [companyId]);
    cache.set(cacheKey, result.rows[0], 300);
  } catch (error) {
    // Silently fail - will be cached on first request
  }
}

/**
 * Warm up reports data
 */
async function warmUpReports(companyId: number) {
  try {
    const cacheKey = `reports:overall:${companyId}:month::`;
    
    // Skip if already cached
    if (cache.get(cacheKey)) {
      return;
    }
    
    const dateFilter = `AND m.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    
    // Simplified version of the reports query
    const overviewQuery = `
      SELECT 
        (SELECT COUNT(*) FROM memberships m JOIN members mem ON m.member_id = mem.id WHERE mem.company_id = $1 ${dateFilter}) as total_memberships,
        (SELECT COUNT(*) FROM memberships m JOIN members mem ON m.member_id = mem.id WHERE mem.company_id = $1 AND m.status = 'active' ${dateFilter}) as active_memberships,
        (SELECT COUNT(*) FROM members WHERE company_id = $1) as total_members
    `;
    
    const result = await pool.query(overviewQuery, [companyId]);
    cache.set(cacheKey, { success: true, overview: result.rows[0] }, 300);
  } catch (error) {
    // Silently fail - will be cached on first request
  }
}

/**
 * Print cache statistics
 */
function printCacheStats() {
  const stats = cache.getStats();
  console.log('\n📊 Cache Statistics:');
  console.log(`   Items cached: ${stats.size}/${stats.maxSize}`);
  console.log(`   Hit rate: ${stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) : 0}%`);
  console.log(`   Hits: ${stats.hits}, Misses: ${stats.misses}`);
}

/**
 * Manual cache refresh endpoint helper
 * Can be called from an API route to refresh specific company data
 */
export async function refreshCompanyCache(companyId: number): Promise<void> {
  console.log(`🔄 Refreshing cache for company ${companyId}...`);
  
  // Clear existing cache
  cache.delete(`membership-plans:${companyId}`);
  cache.delete(`settings:${companyId}`);
  cache.delete(`staff:list:${companyId}`);
  cache.delete(`dashboard:stats:${companyId}`);
  
  // Re-warm
  await warmUpCompanyData({ id: companyId, name: `Company ${companyId}` });
}
