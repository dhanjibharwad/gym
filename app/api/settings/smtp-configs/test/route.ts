import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/api-permissions';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  const { authorized, response, session } = await checkPermission(request, 'manage_settings');
  if (!authorized) return response;

  const { id, testEmail } = await request.json();

  if (!id || !testEmail) {
    return NextResponse.json({ error: 'Config ID and test email are required' }, { status: 400 });
  }

  // Fetch full config including password from DB
  const result = await pool.query(
    'SELECT * FROM smtp_configs WHERE id = $1 AND company_id = $2',
    [id, session!.user.companyId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'SMTP config not found' }, { status: 404 });
  }

  const config = result.rows[0];

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.username, pass: config.password },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: `"${config.from_name || 'Gym Management'}" <${config.username}>`,
      to: testEmail,
      subject: 'SMTP Test - Gym Portal',
      html: `<div style="font-family:Arial,sans-serif;max-width:500px">
        <h2 style="color:#ea580c">✅ SMTP Test Successful</h2>
        <p>Your SMTP configuration is working correctly.</p>
        <p><strong>Host:</strong> ${config.host}<br><strong>Port:</strong> ${config.port}</p>
      </div>`,
    });

    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
