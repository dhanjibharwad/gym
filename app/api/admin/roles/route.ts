import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission, checkAnyPermission } from '@/lib/api-permissions';
import { isProtectedRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    // Check view_roles or manage_roles permission
    const auth = await checkAnyPermission(request, ['view_roles', 'manage_roles']);
    if (!auth.authorized) {
      return auth.response;
    }

    const result = await pool.query(
      `SELECT r.id, r.name, r.description, r.is_protected, r.is_system_role,
        COUNT(DISTINCT rp.permission_id) as permission_count,
        COUNT(DISTINCT u.id) as user_count
       FROM roles r
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       LEFT JOIN users u ON u.role_id = r.id
       WHERE r.company_id = $1
       GROUP BY r.id, r.name, r.description, r.is_protected, r.is_system_role
       ORDER BY r.name`,
      [auth.session!.user.companyId]
    );

    return NextResponse.json({ roles: result.rows });
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check manage_roles permission
    const auth = await checkPermission(request, 'manage_roles');
    if (!auth.authorized) {
      return auth.response;
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Prevent creating roles with protected names
    if (isProtectedRole(trimmedName)) {
      return NextResponse.json({ 
        error: `Cannot create role with name '${trimmedName}' - this is a protected system role` 
      }, { status: 403 });
    }

    // Check if role already exists
    const existing = await pool.query(
      'SELECT id FROM roles WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
      [auth.session!.user.companyId, trimmedName]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 409 });
    }

    const result = await pool.query(
      'INSERT INTO roles (company_id, name, description, is_protected, is_system_role) VALUES ($1, $2, $3, false, false) RETURNING *',
      [auth.session!.user.companyId, trimmedName, description?.trim() || '']
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
    // Check manage_roles permission
    const auth = await checkPermission(request, 'manage_roles');
    if (!auth.authorized) {
      return auth.response;
    }

    const { id, name, description } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Role ID and name are required' }, { status: 400 });
    }

    // Check if role exists and belongs to company
    const existing = await pool.query(
      'SELECT id, name, is_protected FROM roles WHERE id = $1 AND company_id = $2',
      [id, auth.session!.user.companyId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = existing.rows[0];

    // Prevent modifying protected roles
    if (role.is_protected || isProtectedRole(role.name)) {
      return NextResponse.json({ 
        error: `Cannot modify protected role '${role.name}'` 
      }, { status: 403 });
    }

    const trimmedName = name.trim();

    // Prevent renaming to a protected role name
    if (isProtectedRole(trimmedName) && trimmedName.toLowerCase() !== role.name.toLowerCase()) {
      return NextResponse.json({ 
        error: `Cannot rename role to '${trimmedName}' - this is a protected system role name` 
      }, { status: 403 });
    }

    // Check if name is taken by another role
    const duplicate = await pool.query(
      'SELECT id FROM roles WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [auth.session!.user.companyId, trimmedName, id]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 409 });
    }

    const result = await pool.query(
      'UPDATE roles SET name = $1, description = $2 WHERE id = $3 AND company_id = $4 RETURNING *',
      [trimmedName, description?.trim() || '', id, auth.session!.user.companyId]
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
    // Check manage_roles permission
    const auth = await checkPermission(request, 'manage_roles');
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    // Check if role exists and belongs to company
    const existing = await pool.query(
      'SELECT id, name, is_protected FROM roles WHERE id = $1 AND company_id = $2',
      [id, auth.session!.user.companyId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = existing.rows[0];

    // Prevent deletion of protected roles
    if (role.is_protected || isProtectedRole(role.name)) {
      return NextResponse.json({ 
        error: `Cannot delete protected role '${role.name}'` 
      }, { status: 403 });
    }

    // Check if any users have this role
    const users = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role_id = $1',
      [id]
    );

    if (parseInt(users.rows[0].count) > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete role assigned to users. Please reassign users first.' 
      }, { status: 409 });
    }

    // Delete role permissions first
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    // Delete the role
    await pool.query(
      'DELETE FROM roles WHERE id = $1 AND company_id = $2',
      [id, auth.session!.user.companyId]
    );

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
