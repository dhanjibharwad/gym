import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      role: session.user.role,
      userId: session.user.id
    });
  } catch (error) {
    console.error('Session validation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
  }
}