import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await pool.query(
      'SELECT id, name, description FROM roles WHERE company_id = $1 ORDER BY name',
      [session.user.companyId]
    );

    return NextResponse.json({ roles: result.rows });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check if role already exists
    const existing = await pool.query(
      'SELECT id FROM roles WHERE company_id = $1 AND name = $2',
      [session.user.companyId, name.trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 409 });
    }

    const result = await pool.query(
      'INSERT INTO roles (company_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [session.user.companyId, name.trim(), description?.trim() || '']
    );

    return NextResponse.json({ 
      message: 'Role created successfully',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}