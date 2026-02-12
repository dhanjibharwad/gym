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
      'SELECT receipt_template FROM settings WHERE company_id = $1',
      [session.user.companyId]
    );

    const template = result.rows[0]?.receipt_template || null;

    return NextResponse.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching receipt template:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch receipt template'
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
      `INSERT INTO settings (company_id, receipt_template) 
       VALUES ($1, $2) 
       ON CONFLICT (company_id) 
       DO UPDATE SET receipt_template = $2, updated_at = CURRENT_TIMESTAMP`,
      [session.user.companyId, JSON.stringify(body.template)]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Receipt template saved successfully'
    });
  } catch (error) {
    console.error('Error saving receipt template:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save receipt template'
    }, { status: 500 });
  }
}
