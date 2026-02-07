import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

// Role-based permissions configuration
const ROLE_PERMISSIONS = {
  admin: ['view_revenue', 'add_members', 'manage_payments', 'view_members', 'manage_staff'],
  Admin: ['view_revenue', 'add_members', 'manage_payments', 'view_members', 'manage_staff'],
  reception: ['add_members', 'manage_payments', 'view_members'],
  Reception: ['add_members', 'manage_payments', 'view_members']
};

function getRolePermissions(role: string): string[] {
  // This will be replaced by database lookup in the updated system
  // For now, return admin permissions for custom roles
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  if (permissions) {
    return permissions;
  }
  return ['view_dashboard', 'view_members', 'add_members', 'manage_payments', 'view_staff'];
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id || !session.user.name || !session.user.role) {
      return NextResponse.json(
        { success: false, error: 'No valid session' },
        { status: 401 }
      );
    }

    // Get user permissions from database
    let userPermissions: string[] = [];
    let companyName = '';
    try {
      const result = await pool.query(`
        SELECT DISTINCT p.name 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        JOIN users u ON u.role_id = rp.role_id
        WHERE u.id = $1
      `, [session.user.id]);
      
      userPermissions = result.rows.map(row => row.name);
      
      // Get company name
      const companyResult = await pool.query(`
        SELECT c.name 
        FROM users u
        JOIN companies c ON u.company_id = c.id
        WHERE u.id = $1
      `, [session.user.id]);
      
      if (companyResult.rows.length > 0) {
        companyName = companyResult.rows[0].name;
      }
      
      // If no permissions found, use default based on role
      if (userPermissions.length === 0) {
        userPermissions = getRolePermissions(session.user.role);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      userPermissions = getRolePermissions(session.user.role);
    }

    const user = {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      permissions: userPermissions,
      companyName
    };

    return NextResponse.json({
      success: true,
      user
    });

  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}