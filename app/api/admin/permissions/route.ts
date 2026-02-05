import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

// Define available modules and their permissions
const MODULES = {
  dashboard: { name: 'Dashboard', permissions: ['view_dashboard'] },
  members: { name: 'Members', permissions: ['view_members', 'add_members', 'edit_members', 'delete_members'] },
  payments: { name: 'Payments', permissions: ['view_payments', 'manage_payments', 'view_revenue'] },
  staff: { name: 'Staff Management', permissions: ['view_staff', 'add_staff', 'edit_staff', 'delete_staff'] },
  reports: { name: 'Reports', permissions: ['view_reports', 'export_reports'] },
  settings: { name: 'Settings', permissions: ['manage_settings', 'manage_roles'] }
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (roleId) {
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

      return NextResponse.json({ modules: MODULES, rolePermissions });
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
    const session = await getSession();
    if (!session || session.user.role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { roleId, permissions } = await request.json();

    if (!roleId || !permissions) {
      return NextResponse.json({ error: 'Role ID and permissions are required' }, { status: 400 });
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
          `, [perm, module, `${perm.replace('_', ' ')} permission`]);
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