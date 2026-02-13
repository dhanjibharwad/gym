import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkAnyPermission } from '@/lib/api-permissions';
import { unstable_cache } from 'next/cache';

interface MemberQueryResult {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  profile_photo_url: string;
  created_at: string;
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
          LOWER(email) LIKE $2
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
          id,
          full_name,
          phone_number,
          email,
          gender,
          date_of_birth,
          profile_photo_url,
          created_at
        FROM members 
        WHERE company_id = $1 ${searchCondition}
        ORDER BY created_at DESC
        LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
      `;
      
      const membersResult = await client.query(membersQuery, [
        ...searchParams,
        limit,
        offset
      ]);
      
      return {
        members: membersResult.rows,
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