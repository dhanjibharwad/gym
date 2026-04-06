import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { cache } from '@/lib/cache/MemoryCache';

// GET — list all smtp configs for company
export async function GET(request: NextRequest) {
  const companyId = request.headers.get('x-company-id');
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cacheKey = `smtp-configs:${companyId}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  const result = await pool.query(
    `SELECT id, host, port, secure, username, from_name, is_active, created_at FROM smtp_configs WHERE company_id = $1 ORDER BY created_at ASC`,
    [parseInt(companyId)]
  );
  const data = { success: true, configs: result.rows };
  cache.set(cacheKey, data, 300);
  return NextResponse.json(data);
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

  cache.delete(`smtp-configs:${companyId}`);
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
  cache.delete(`smtp-configs:${companyId}`);
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
  cache.delete(`smtp-configs:${companyId}`);
  return NextResponse.json({ success: true });
}
