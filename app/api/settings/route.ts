import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/api-permissions';

export async function GET() {
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

    return NextResponse.json({
      success: true,
      settings: { paymentModes }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check manage_settings permission
    const { authorized, response } = await checkPermission(request, 'manage_settings');
    if (!authorized) return response;

    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    await pool.query(
      `INSERT INTO settings (company_id, payment_modes) 
       VALUES ($1, $2) 
       ON CONFLICT (company_id) 
       DO UPDATE SET payment_modes = $2, updated_at = CURRENT_TIMESTAMP`,
      [session.user.companyId, JSON.stringify(body.paymentModes)]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save settings'
    }, { status: 500 });
  }
}