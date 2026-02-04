import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
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

  } catch (error) {
    console.error('Auth verification error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

function getRolePermissions(role: string): string[] {
  const permissions = {
    admin: ['view_revenue', 'add_members', 'manage_payments', 'view_members', 'manage_staff'],
    reception: ['add_members', 'manage_payments', 'view_members']
  };
  return permissions[role as keyof typeof permissions] || [];
}