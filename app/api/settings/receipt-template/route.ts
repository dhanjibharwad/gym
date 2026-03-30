import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/api-permissions';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Receipt template API called for company ${session.user.companyId}`);

    // Use a timeout promise to prevent long-running queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const queryPromise = pool.query(
      'SELECT receipt_template FROM settings WHERE company_id = $1',
      [session.user.companyId]
    );

    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    const template = result.rows[0]?.receipt_template || null;

    const duration = Date.now() - startTime;
    console.log(`Receipt template API completed in ${duration}ms for company ${session.user.companyId}`);

    // Return with no-cache headers to prevent cross-company caching
    return new NextResponse(
      JSON.stringify({
        success: true,
        template,
        companyId: session.user.companyId // Include for debugging
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Error fetching receipt template after ${duration}ms:`, error);
    
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
