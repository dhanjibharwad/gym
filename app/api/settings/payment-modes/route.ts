import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      success: true,
      paymentModes: enabledPaymentModes
    });
  } catch (error) {
    console.error('Error fetching payment modes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment modes' },
      { status: 500 }
    );
  }
}