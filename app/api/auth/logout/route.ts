import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}