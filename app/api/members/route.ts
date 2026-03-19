import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAnyPermission } from '@/lib/api-permissions';
import { unstable_cache } from 'next/cache';

interface MemberQueryResult {
  id: number;
  member_number: number;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  profile_photo_url: string;
  created_at: string;
  membership_status: 'none' | 'active' | 'expired';
  membership_details?: {
    plan_name: string;
    start_date: string;
    end_date: string;
    trainer_assigned?: string;
    batch_time?: string;
  };
}

// Cached function for fetching members with pagination
const getCachedMembers = unstable_cache(
  async (
    companyId: number,
    page: number,
    limit: number,
    search: string
  ): Promise<{ members: MemberQueryResult[]; total: number; totalPages: number }> => {
    const client = await pool.connect();
    
    try {
      const offset = (page - 1) * limit;
      
      // Build search condition
      let searchCondition = '';
      let searchParams: (number | string)[] = [companyId];
      
      if (search && search.trim()) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        searchCondition = `AND (
          LOWER(full_name) LIKE $2 OR 
          phone_number LIKE $2 OR 
          LOWER(email) LIKE $2 OR
          LOWER(member_number) LIKE $2
        )`;
        searchParams = [companyId, searchTerm];
      }
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM members 
        WHERE company_id = $1 ${searchCondition}
      `;
      const countResult = await client.query(countQuery, searchParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);
      
      // Get paginated members - only fetch needed columns for list view
      const membersQuery = `
        SELECT 
          m.id,
          m.member_number,
          m.member_number as formatted_member_id,
          m.full_name,
          m.phone_number,
          m.email,
          m.gender,
          m.date_of_birth,
          m.profile_photo_url,
          m.created_at,
          CASE 
            WHEN membership.id IS NULL THEN 'none'
            WHEN membership.end_date >= CURRENT_DATE THEN 'active'
            ELSE 'expired'
          END as membership_status,
          membership.plan_name,
          membership.start_date,
          membership.end_date,
          membership.trainer_assigned,
          membership.batch_time
        FROM members m
        LEFT JOIN (
          SELECT 
            ms.id,
            ms.member_id,
            ms.plan_id,
            ms.start_date,
            ms.end_date,
            ms.trainer_assigned,
            ms.batch_time,
            mp.plan_name,
            ROW_NUMBER() OVER (PARTITION BY ms.member_id ORDER BY ms.created_at DESC) as rn
          FROM memberships ms
          JOIN membership_plans mp ON ms.plan_id = mp.id
          WHERE mp.company_id = $1
        ) membership ON m.id = membership.member_id AND membership.rn = 1
        WHERE m.company_id = $1 ${searchCondition}
        ORDER BY m.created_at DESC
        LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
      `;
      
      const membersResult = await client.query(membersQuery, [
        ...searchParams,
        limit,
        offset
      ]);
      
      // Format the results to match the expected interface
      const formattedMembers = membersResult.rows.map(row => ({
        ...row,
        membership_details: row.plan_name ? {
          plan_name: row.plan_name,
          start_date: row.start_date,
          end_date: row.end_date,
          trainer_assigned: row.trainer_assigned,
          batch_time: row.batch_time
        } : undefined
      }));
      
      return {
        members: formattedMembers,
        total,
        totalPages
      };
    } finally {
      client.release();
    }
  },
  ['members-list'],
  {
    revalidate: 30, // Cache for 30 seconds
    tags: ['members']
  }
);

export async function GET(request: NextRequest) {
  try {
    // Check view_members or add_members permission
    const auth = await checkAnyPermission(request, ['view_members', 'add_members', 'edit_members']);
    if (!auth.authorized) {
      return auth.response;
    }
    
    const companyId = auth.session!.user.companyId;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    
    // Use cached function for better performance
    const { members, total, totalPages } = await getCachedMembers(
      companyId,
      page,
      limit,
      search
    );
    
    return NextResponse.json({
      success: true,
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database connection failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}