import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/api-permissions';

// GET — list all smtp configs for company
export async function GET() {
  const session = await getSession();
  if (!session?.user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await pool.query(
    `SELECT id, host, port, secure, username, from_name, is_active, created_at FROM smtp_configs WHERE company_id = $1 ORDER BY created_at ASC`,
    [session.user.companyId]
  );
  return NextResponse.json({ success: true, configs: result.rows });
}

// POST — add new smtp config
export async function POST(request: NextRequest) {
  const { authorized, response, session } = await checkPermission(request, 'manage_settings');
  if (!authorized) return response;

  const { host, port, secure, username, password, fromName } = await request.json();
  if (!host || !port || !username || !password) {
    return NextResponse.json({ error: 'Host, port, username and password are required' }, { status: 400 });
  }

  const companyId = session!.user.companyId;

  // Check if this is the first config — auto set active
  const existing = await pool.query('SELECT COUNT(*) FROM smtp_configs WHERE company_id = $1', [companyId]);
  const isFirst = parseInt(existing.rows[0].count) === 0;

  const result = await pool.query(
    `INSERT INTO smtp_configs (company_id, host, port, secure, username, password, from_name, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [companyId, host, parseInt(port), port == 465, username, password, fromName || 'Gym Management', isFirst]
  );

  return NextResponse.json({ success: true, id: result.rows[0].id, isActive: isFirst });
}

// PATCH — set a config as active (deactivates all others)
export async function PATCH(request: NextRequest) {
  const { authorized, response, session } = await checkPermission(request, 'manage_settings');
  if (!authorized) return response;

  const { id } = await request.json();
  const companyId = session!.user.companyId;

  await pool.query('UPDATE smtp_configs SET is_active = FALSE WHERE company_id = $1', [companyId]);
  await pool.query('UPDATE smtp_configs SET is_active = TRUE WHERE id = $1 AND company_id = $2', [id, companyId]);

  return NextResponse.json({ success: true });
}

// DELETE — remove a smtp config
export async function DELETE(request: NextRequest) {
  const { authorized, response, session } = await checkPermission(request, 'manage_settings');
  if (!authorized) return response;

  const { id } = await request.json();
  const companyId = session!.user.companyId;

  // If deleting active one, activate the next available
  const deleted = await pool.query(
    'DELETE FROM smtp_configs WHERE id = $1 AND company_id = $2 RETURNING is_active',
    [id, companyId]
  );

  if (deleted.rows[0]?.is_active) {
    await pool.query(
      'UPDATE smtp_configs SET is_active = TRUE WHERE company_id = $1 ORDER BY created_at ASC LIMIT 1',
      [companyId]
    );
  }

  return NextResponse.json({ success: true });
}
