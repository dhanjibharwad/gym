import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { cache } from '@/lib/cache/MemoryCache';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');
    if (!companyId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const cacheKey = `settings:${companyId}`;
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await pool.query(
      'SELECT payment_modes FROM settings WHERE company_id = $1',
      [parseInt(companyId)]
    );

    const paymentModes = result.rows[0]?.payment_modes || {
      Cash: { enabled: true, processingFee: 0 },
      UPI: { enabled: true, processingFee: 1.5 },
      Card: { enabled: true, processingFee: 2.5 },
      Online: { enabled: true, processingFee: 2.0 },
      Cheque: { enabled: true, processingFee: 0 }
    };

    const responseData = {
      success: true,
      settings: { paymentModes }
    };
    
    // Cache for 10 minutes (settings don't change often)
    cache.set(cacheKey, responseData, 600);
    return NextResponse.json(responseData);
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
    const { authorized, response, session: authSession } = await checkPermission(request, 'manage_settings');
    if (!authorized) return response;

    const companyId = request.headers.get('x-company-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || 'staff';
    if (!companyId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    await pool.query(
      `INSERT INTO settings (company_id, payment_modes) 
       VALUES ($1, $2) 
       ON CONFLICT (company_id) 
       DO UPDATE SET payment_modes = $2, updated_at = CURRENT_TIMESTAMP`,
      [parseInt(companyId), JSON.stringify(body.paymentModes)]
    );
    
    cache.delete(`settings:${companyId}`);
    
    await pool.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['UPDATE', 'settings', parseInt(companyId), `Payment mode settings updated`, userRole, parseInt(companyId)]
    );
    
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, message: 'Failed to save settings' }, { status: 500 });
  }
}