import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Role-based permissions configuration
const ROLE_PERMISSIONS = {
  admin: ['view_revenue', 'add_members', 'manage_payments', 'view_members', 'manage_staff'],
  reception: ['add_members', 'manage_payments', 'view_members']
};

function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
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

    const user = {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
      permissions: getRolePermissions(session.user.role)
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