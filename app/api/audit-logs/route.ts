import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { cache } from '@/lib/cache/MemoryCache';

export async function POST(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { action, entity_type, entity_id, details, user_role } = await request.json();
    
    const client = await pool.connect();
    
    try {
      await client.query(
        'INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [action, entity_type, entity_id, details, user_role, companyId]
      );
      
      return NextResponse.json({ success: true });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check view_audit_logs permission
    const { authorized, response, session } = await checkPermission(request, 'view_audit_logs');
    if (!authorized) return response;

    const companyId = session!.user.companyId;
    
    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50')));
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';
    
    const offset = (page - 1) * limit;
    
    // Check cache first
    const cacheKey = `audit:${companyId}:${page}:${limit}:${action}:${entityType}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const client = await pool.connect();
    
    try {
      // Build conditions
      const conditions: string[] = ['company_id = $1'];
      const params: any[] = [companyId];
      let paramIndex = 2;
      
      if (action) {
        conditions.push(`action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }
      
      if (entityType) {
        conditions.push(`entity_type = $${paramIndex}`);
        params.push(entityType);
        paramIndex++;
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);
      
      // Get paginated results
      const result = await client.query(`
        SELECT 
          id,
          action,
          entity_type,
          entity_id,
          details,
          user_role,
          created_at
        FROM audit_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);
      
      const responseData = {
        success: true,
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
      
      // Cache for 2 minutes
      cache.set(cacheKey, responseData, 120);
      
      return NextResponse.json(responseData);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
}