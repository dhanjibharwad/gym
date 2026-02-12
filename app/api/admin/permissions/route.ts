import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission, checkAnyPermission } from '@/lib/api-permissions';
import { MODULES, ALL_PERMISSIONS } from '@/lib/permissions';
import { isAdmin } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    // Check view_roles or manage_roles permission
    const auth = await checkAnyPermission(request, ['view_roles', 'manage_roles']);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (roleId) {
      // Get role info to check if it's admin
      const roleResult = await pool.query(
        'SELECT name FROM roles WHERE id = $1 AND company_id = $2',
        [roleId, auth.session!.user.companyId]
      );

      // If admin role, return all permissions
      if (roleResult.rows.length > 0 && isAdmin(roleResult.rows[0].name)) {
        const allPermissions: Record<string, string[]> = {};
        Object.entries(MODULES).forEach(([key, module]) => {
          allPermissions[key] = module.permissions.map(p => p.name);
        });
        
        return NextResponse.json({ 
          modules: MODULES, 
          rolePermissions: allPermissions,
          isAdmin: true 
        });
      }

      // Get permissions for specific role
      const result = await pool.query(`
        SELECT p.name as permission_name, p.module 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
      `, [roleId]);

      const rolePermissions = result.rows.reduce((acc: any, row: any) => {
        if (!acc[row.module]) acc[row.module] = [];
        acc[row.module].push(row.permission_name);
        return acc;
      }, {});

      return NextResponse.json({ 
        modules: MODULES, 
        rolePermissions,
        isAdmin: false 
      });
    }

    // Return all modules
    return NextResponse.json({ modules: MODULES });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check manage_roles permission
    const auth = await checkPermission(request, 'manage_roles');
    if (!auth.authorized) {
      return auth.response;
    }

    const { roleId, permissions } = await request.json();

    if (!roleId || !permissions) {
      return NextResponse.json({ error: 'Role ID and permissions are required' }, { status: 400 });
    }

    // Check if role is admin - admin always has all permissions
    const roleResult = await pool.query(
      'SELECT name FROM roles WHERE id = $1 AND company_id = $2',
      [roleId, auth.session!.user.companyId]
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Cannot modify admin role permissions - admin has all permissions implicitly
    if (isAdmin(roleResult.rows[0].name)) {
      return NextResponse.json({ 
        error: 'Cannot modify admin role permissions. Admin has full access to all modules.' 
      }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure all permissions exist in the database
      for (const [module, modulePerms] of Object.entries(permissions)) {
        for (const perm of modulePerms as string[]) {
          await client.query(`
            INSERT INTO permissions (name, module, description) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (name) DO NOTHING
          `, [perm, module, `${perm.replace(/_/g, ' ')} permission`]);
        }
      }

      // Clear existing permissions for this role
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // Add new permissions
      for (const [module, modulePerms] of Object.entries(permissions)) {
        for (const perm of modulePerms as string[]) {
          const permResult = await client.query('SELECT id FROM permissions WHERE name = $1', [perm]);
          if (permResult.rows.length > 0) {
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id) 
              VALUES ($1, $2)
            `, [roleId, permResult.rows[0].id]);
          }
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Permissions updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}
