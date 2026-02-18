import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import { ALL_PERMISSION_NAMES } from '@/lib/permissions';
import { isAdmin } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id || !session.user.name || !session.user.role) {
      return NextResponse.json(
        { success: false, error: 'No valid session' },
        { status: 401 }
      );
    }

    const userIsAdmin = isAdmin(session.user.role);
    let userPermissions: string[] = [];
    let companyName = '';
    let roleName = session.user.role;

    try {
      // Get company name and role info
      const companyResult = await pool.query(`
        SELECT c.name, r.name as role_name
        FROM users u
        JOIN companies c ON u.company_id = c.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `, [session.user.id]);
      
      if (companyResult.rows.length > 0) {
        companyName = companyResult.rows[0].name;
        if (companyResult.rows[0].role_name) {
          roleName = companyResult.rows[0].role_name;
        }
      }

      // Admin gets ALL permissions implicitly
      if (userIsAdmin) {
        userPermissions = [...ALL_PERMISSION_NAMES];
      } else {
        // Staff roles get permissions from role_permissions table
        const result = await pool.query(`
          SELECT DISTINCT p.name 
          FROM role_permissions rp
          JOIN permissions p ON rp.permission_id = p.id
          WHERE rp.role_id = (
            SELECT role_id FROM users WHERE id = $1
          )
        `, [session.user.id]);
        
        userPermissions = result.rows.map(row => row.name);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      // Fallback: admin gets all, staff gets view_dashboard only
      userPermissions = userIsAdmin ? [...ALL_PERMISSION_NAMES] : ['view_dashboard'];
    }

    const user = {
      id: session.user.id,
      name: session.user.name,
      role: roleName,
      permissions: userPermissions,
      isAdmin: userIsAdmin,
      companyName,
      companyId: session.user.companyId
    };

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}