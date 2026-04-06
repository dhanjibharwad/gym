import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionFromRequest } from '@/lib/session-utils';
import { cache } from '@/lib/cache/MemoryCache';

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session?.user?.companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = `payment-modes:${session.user.companyId}`;
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await pool.query(
      'SELECT payment_modes FROM settings WHERE company_id = $1',
      [session.user.companyId]
    );

    const paymentModes = result.rows[0]?.payment_modes || {
      Cash: { enabled: true, processingFee: 0 },
      UPI: { enabled: true, processingFee: 1.5 },
      Card: { enabled: true, processingFee: 2.5 },
      Online: { enabled: true, processingFee: 2.0 },
      Cheque: { enabled: true, processingFee: 0 }
    };

    const enabledPaymentModes = Object.entries(paymentModes)
      .filter(([_, config]: [string, any]) => config.enabled)
      .map(([name, config]: [string, any]) => ({ name, ...config }));

    const data = { success: true, paymentModes: enabledPaymentModes };
    cache.set(cacheKey, data, 300);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch payment modes' }, { status: 500 });
  }
}