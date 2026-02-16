import { NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function POST() {
  try {
    // Get session info before deleting
    const session = await getSession();
    
    // Log logout event if session exists
    if (session?.user && session.user.role !== 'SuperAdmin') {
      await createAuditLog({
        companyId: session.user.companyId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: session.user.id,
        details: `${session.user.name} (${session.user.email}) logged out`,
        userRole: session.user.role,
        userId: session.user.id
      });
    }
    
    await deleteSession();
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Log minimal error info for debugging without exposing sensitive data
    console.error('Logout failed');
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}