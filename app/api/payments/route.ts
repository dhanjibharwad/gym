import { NextRequest, NextResponse } from 'next/server';
import { paymentOps } from '@/lib/optimized-queries';
import { checkPermission } from '@/lib/api-permissions';

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkPermission(request, 'view_payments');
    if (!authorized) return response;

    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    // Use optimized query with caching (5 minutes for ultra-fast response)
    const result = await paymentOps.getList(
      parseInt(companyId),
      { page, limit, status, startDate, endDate },
      { cacheTTL: 300, useCache: true }
    ) as any;
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}