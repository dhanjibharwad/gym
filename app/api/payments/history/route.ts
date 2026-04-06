import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { cache } from '@/lib/cache/MemoryCache';

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkPermission(request, 'view_payments');
    if (!authorized) return response;

    const companyId = request.headers.get('x-company-id');
    if (!companyId) return NextResponse.json({ success: false, message: 'Company ID required' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '50'));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const offset = (page - 1) * limit;

    const cacheKey = `payment-history:${companyId}:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pt.id,
          pt.member_id,
          pt.membership_id,
          pt.transaction_type,
          pt.amount,
          pt.payment_mode,
          pt.transaction_date,
          pt.receipt_number,
          pt.created_by,
          pt.created_at,
          m.full_name,
          m.phone_number,
          m.profile_photo_url,
          mp.plan_name,
          p.total_amount,
          p.paid_amount,
          p.payment_status
        FROM payment_transactions pt
        JOIN memberships ms ON pt.membership_id = ms.id
        JOIN members m ON pt.member_id = m.id
        JOIN membership_plans mp ON ms.plan_id = mp.id
        JOIN payments p ON pt.membership_id = p.membership_id
        WHERE m.company_id = $1
        ORDER BY pt.transaction_date DESC, pt.created_at DESC
        LIMIT $2 OFFSET $3
      `, [companyId, limit, offset]);

      const data = { success: true, transactions: result.rows };
      cache.set(cacheKey, data, 60);
      return NextResponse.json(data);
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch payment history' }, { status: 500 });
  }
}