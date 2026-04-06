import { NextRequest, NextResponse } from 'next/server';
import { memberOps } from '@/lib/optimized-queries';
import { checkAnyPermission } from '@/lib/api-permissions';

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
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    
    const result = await memberOps.getList(
      companyId,
      { page, limit, search, status },
      { cacheTTL: 60, useCache: !search } // skip cache when searching
    );
    
    return NextResponse.json({
      success: true,
      ...result
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