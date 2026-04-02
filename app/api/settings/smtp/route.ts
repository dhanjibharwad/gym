import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT smtp_config FROM settings WHERE company_id = $1`,
      [session.user.companyId]
    );

    const smtp = result.rows[0]?.smtp_config || null;
    return NextResponse.json({ success: true, smtp });
  } catch (error) {
    console.error('SMTP GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch SMTP config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response, session } = await checkPermission(request, 'manage_settings');
    if (!authorized) return response;

    const { host, port, secure, user, password, fromName } = await request.json();

    if (!host || !port || !user || !password) {
      return NextResponse.json({ error: 'Host, port, email and password are required' }, { status: 400 });
    }

    const smtpConfig = {
      host,
      port: parseInt(port),
      secure: !!secure,
      user,
      password,
      fromName: fromName || 'Gym Management',
    };

    await pool.query(
      `INSERT INTO settings (company_id, smtp_config)
       VALUES ($1, $2)
       ON CONFLICT (company_id)
       DO UPDATE SET smtp_config = $2, updated_at = NOW()`,
      [session!.user.companyId, JSON.stringify(smtpConfig)]
    );

    return NextResponse.json({ success: true, message: 'SMTP settings saved' });
  } catch (error) {
    console.error('SMTP POST error:', error);
    return NextResponse.json({ error: 'Failed to save SMTP config' }, { status: 500 });
  }
}
