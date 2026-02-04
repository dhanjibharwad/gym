import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  try {
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