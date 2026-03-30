/**
 * Optimized Database Query Utilities
 * 
 * High-performance database queries with:
 * - Proper indexing usage
 * - Column selection (no SELECT *)
 * - Efficient JOINs
 * - Built-in caching
 * - Pagination support
 */

import pool from './db';
import { cache } from './cache/MemoryCache';

export interface QueryOptions {
  cacheTTL?: number; // Cache time-to-live in seconds
  useCache?: boolean;
}

/**
 * Optimized member queries
 */
export const memberOps = {
  /**
   * Get members list with pagination - OPTIMIZED
   */
  async getList(
    companyId: number,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
    queryOptions: QueryOptions = { cacheTTL: 300, useCache: true } // 5 minutes cache
  ) {
    const { page = 1, limit = 20, search = '', status = '' } = options;
    const offset = (page - 1) * limit;
    
    const cacheKey = `members:list:${companyId}:${page}:${limit}:${search}:${status}`;
    
    if (queryOptions.useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const client = await pool.connect();
    try {
      // Build dynamic query based on filters
      const conditions: string[] = ['m.company_id = $1'];
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (search) {
        conditions.push(`(LOWER(m.full_name) LIKE $${paramIndex} OR m.phone_number LIKE $${paramIndex} OR LOWER(m.email) LIKE $${paramIndex})`);
        params.push(`%${search.toLowerCase()}%`);
        paramIndex++;
      }

      if (status) {
        conditions.push(`membership.membership_status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM members m ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results with only needed columns
      const query = `
        SELECT 
          m.id,
          m.member_number,
          m.full_name,
          m.phone_number,
          m.email,
          m.gender,
          m.date_of_birth,
          m.profile_photo_url,
          m.created_at,
          membership.membership_status,
          membership.plan_name,
          membership.start_date,
          membership.end_date
        FROM members m
        LEFT JOIN LATERAL (
          SELECT 
            ms.status as membership_status,
            mp.plan_name,
            ms.start_date,
            ms.end_date
          FROM memberships ms
          JOIN membership_plans mp ON ms.plan_id = mp.id
          WHERE ms.member_id = m.id
          ORDER BY ms.created_at DESC
          LIMIT 1
        ) membership ON true
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await client.query(query, [...params, limit, offset]);

      const response = {
        members: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };

      if (queryOptions.useCache) {
        cache.set(cacheKey, response, queryOptions.cacheTTL);
      }

      return response;
    } finally {
      client.release();
    }
  },

  /**
   * Get single member by ID - OPTIMIZED
   */
  async getById(memberId: number, companyId: number, queryOptions: QueryOptions = { cacheTTL: 600, useCache: true }) {
    const cacheKey = `member:${memberId}:${companyId}`;
    
    if (queryOptions.useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const query = `
      SELECT 
        m.*,
        mp.plan_name as current_plan,
        ms.start_date as membership_start,
        ms.end_date as membership_end,
        ms.status as membership_status,
        mi.medical_conditions,
        mi.injuries_limitations
      FROM members m
      LEFT JOIN LATERAL (
        SELECT * FROM memberships 
        WHERE member_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      ) ms ON true
      LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
      LEFT JOIN medical_info mi ON m.id = mi.member_id
      WHERE m.id = $1 AND m.company_id = $2
    `;

    const result = await pool.query(query, [memberId, companyId]);
    const member = result.rows[0] || null;

    if (member && queryOptions.useCache) {
      cache.set(cacheKey, member, queryOptions.cacheTTL);
    }

    return member;
  },

  /**
   * Get members count by status - FAST
   */
  async getCountByStatus(companyId: number, queryOptions: QueryOptions = { cacheTTL: 300, useCache: true }) {
    const cacheKey = `members:count:status:${companyId}`;
    
    if (queryOptions.useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const query = `
      SELECT 
        membership_status,
        COUNT(*) as count
      FROM members
      WHERE company_id = $1
      GROUP BY membership_status
    `;

    const result = await pool.query(query, [companyId]);
    const counts = result.rows.reduce((acc: any, row: any) => {
      acc[row.membership_status] = parseInt(row.count);
      return acc;
    }, {});

    if (queryOptions.useCache) {
      cache.set(cacheKey, counts, queryOptions.cacheTTL);
    }

    return counts;
  }
};

/**
 * Optimized payment queries
 */
export const paymentOps = {
  /**
   * Get payments list - OPTIMIZED
   */
  async getList(
    companyId: number,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {},
    queryOptions: QueryOptions = { cacheTTL: 300, useCache: true } // 5 minutes cache
  ) {
    const { page = 1, limit = 20, status = '', startDate = '', endDate = '' } = options;
    const offset = (page - 1) * limit;

    console.log('PaymentOps.getList called:', { companyId, page, limit, status });
    
    const cacheKey = `payments:list:${companyId}:${page}:${limit}:${status}:${startDate}:${endDate}`;
    
    if (queryOptions.useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const client = await pool.connect();
    try {
      console.log('Database client connected, executing query...');
      
      const conditions: string[] = ['m.company_id = $1']; // Filter by members.company_id instead
      const params: any[] = [companyId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`p.payment_status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`p.created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`p.created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      console.log('Building count query with conditions:', whereClause);
      
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM payments p 
         JOIN memberships ms ON p.membership_id = ms.id 
         JOIN members m ON ms.member_id = m.id 
         ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const query = `
        SELECT 
          p.id,
          p.membership_id,
          ms.member_id,
          p.total_amount,
          p.paid_amount,
          p.payment_mode,
          p.payment_status,
          p.created_at,
          p.next_due_date,
          m.full_name,
          m.phone_number,
          m.profile_photo_url,
          mp.plan_name,
          ms.start_date,
          ms.end_date
        FROM payments p
        JOIN memberships ms ON p.membership_id = ms.id
        JOIN members m ON ms.member_id = m.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await client.query(query, [...params, limit, offset]);
      console.log('Query executed successfully, rows returned:', result.rows.length);

      const response = {
        payments: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };

      if (queryOptions.useCache) {
        cache.set(cacheKey, response, queryOptions.cacheTTL);
      }

      return response;
    } catch (error) {
      console.error('PaymentOps.getList query error:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get revenue statistics - FAST
   */
  async getRevenueStats(companyId: number, queryOptions: QueryOptions = { cacheTTL: 300, useCache: true }) {
    const cacheKey = `payments:revenue:${companyId}`;
    
    if (queryOptions.useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    const query = `
      SELECT 
        SUM(paid_amount) FILTER (WHERE created_at >= CURRENT_DATE) as today_revenue,
        SUM(paid_amount) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
        SUM(paid_amount) as total_revenue,
        COUNT(*) FILTER (WHERE payment_status IN ('pending', 'partial')) as pending_payments
      FROM payments
      WHERE company_id = $1
    `;

    const result = await pool.query(query, [companyId]);
    const stats = result.rows[0];

    if (queryOptions.useCache) {
      cache.set(cacheKey, stats, queryOptions.cacheTTL);
    }

    return stats;
  }
};

/**
 * Optimized dashboard queries
 */
export const dashboardOps = {
  /**
   * Get all dashboard stats in ONE query - ULTRA FAST
   */
  async getDashboardStats(companyId: number, queryOptions: QueryOptions = { cacheTTL: 120, useCache: true }) {
    const cacheKey = `dashboard:stats:${companyId}`;
    
    if (queryOptions.useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    // Single optimized query to get all stats
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
    const stats = result.rows[0];
    
    // Ensure proper serialization of all values
    const serializedStats = {
      total_members: parseInt((stats as any).total_members) || 0,
      new_today: parseInt((stats as any).new_today) || 0,
      expiring_week: parseInt((stats as any).expiring_week) || 0,
      today_revenue: parseFloat((stats as any).today_revenue) || 0,
      monthly_revenue: parseFloat((stats as any).monthly_revenue) || 0,
      total_revenue: parseFloat((stats as any).total_revenue) || 0,
      pending_payments: parseInt((stats as any).pending_payments) || 0,
      recent_members_list: (stats as any).recent_members_list || [],
      upcoming_birthdays_list: (stats as any).upcoming_birthdays_list || []
    };

    if (queryOptions.useCache) {
      cache.set(cacheKey, serializedStats, queryOptions.cacheTTL);
    }

    return serializedStats;
  }
};

/**
 * Invalidate cache for specific operations
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}
