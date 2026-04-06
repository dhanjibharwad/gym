import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionFromRequest } from '@/lib/session-utils';
import { checkPermission } from '@/lib/api-permissions';
import { cache } from '@/lib/cache/MemoryCache';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session?.user?.companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const companyId = session.user.companyId;

    const cacheKey = `receipt-template:${companyId}`;
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await pool.query(
      'SELECT receipt_template FROM settings WHERE company_id = $1',
      [companyId]
    );
    const template = result.rows[0]?.receipt_template || null;
    const data = { success: true, template };
    cache.set(cacheKey, data, 300);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch receipt template' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = await checkPermission(request, 'manage_settings');
    if (!authorized) return response;

    const companyId = request.headers.get('x-company-id');
    if (!companyId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    await pool.query(
      `INSERT INTO settings (company_id, receipt_template) VALUES ($1, $2)
       ON CONFLICT (company_id) DO UPDATE SET receipt_template = $2, updated_at = CURRENT_TIMESTAMP`,
      [parseInt(companyId), JSON.stringify(body.template)]
    );
    cache.delete(`receipt-template:${companyId}`);
    return NextResponse.json({ success: true, message: 'Receipt template saved successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to save receipt template' }, { status: 500 });
  }
}