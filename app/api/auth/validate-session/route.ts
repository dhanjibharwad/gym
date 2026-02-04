import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user?.role || !session.user.id) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      role: session.user.role,
      userId: session.user.id
    });
  } catch {
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}