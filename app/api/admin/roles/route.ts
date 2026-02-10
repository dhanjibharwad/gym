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

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, name, description } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Role ID and name are required' }, { status: 400 });
    }

    // Check if role exists and belongs to company
    const existing = await pool.query(
      'SELECT id, name FROM roles WHERE id = $1 AND company_id = $2',
      [id, session.user.companyId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent renaming system roles
    const currentName = existing.rows[0].name.toLowerCase();
    if ((currentName === 'admin' || currentName === 'reception') && name.trim().toLowerCase() !== currentName) {
      return NextResponse.json({ error: 'Cannot rename system roles (admin/reception)' }, { status: 403 });
    }

    // Check if name is taken by another role
    const duplicate = await pool.query(
      'SELECT id FROM roles WHERE company_id = $1 AND name = $2 AND id != $3',
      [session.user.companyId, name.trim(), id]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 });
    }

    const result = await pool.query(
      'UPDATE roles SET name = $1, description = $2 WHERE id = $3 AND company_id = $4 RETURNING *',
      [name.trim(), description?.trim() || '', id, session.user.companyId]
    );

    return NextResponse.json({ 
      message: 'Role updated successfully',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Check if role exists and belongs to company
    const existing = await pool.query(
      'SELECT id, name FROM roles WHERE id = $1 AND company_id = $2',
      [id, session.user.companyId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent deletion of admin and reception roles
    const roleName = existing.rows[0].name.toLowerCase();
    if (roleName === 'admin' || roleName === 'reception') {
      return NextResponse.json({ error: 'Cannot delete system roles (admin/reception)' }, { status: 403 });
    }

    // Check if role has assigned permissions
    const permissions = await pool.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE role_id = $1',
      [id]
    );

    if (parseInt(permissions.rows[0].count) > 0) {
      return NextResponse.json({ error: 'Cannot delete role with assigned permissions' }, { status: 409 });
    }

    // Check if any users have this role
    const users = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND role = $2',
      [session.user.companyId, existing.rows[0].name]
    );

    if (parseInt(users.rows[0].count) > 0) {
      return NextResponse.json({ error: 'Cannot delete role assigned to users' }, { status: 409 });
    }

    await pool.query(
      'DELETE FROM roles WHERE id = $1 AND company_id = $2',
      [id, session.user.companyId]
    );

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}