import { NextRequest, NextResponse } from 'next/server';
import { deleteVerificationToken, getUserByEmail, verifyToken } from '@/lib/auth';

// Helper function to update user verification status
async function updateUserVerificationStatus(userId: number): Promise<void> {
  const { default: pool } = await import('@/lib/db');
  await pool.query(
    'UPDATE users SET is_verified = true WHERE id = $1',
    [userId]
  );
}

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.is_verified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Verify OTP token
    const isValidToken = await verifyToken(user.id, otp, 'email_verification');

    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Update user as verified using helper function
    await updateUserVerificationStatus(user.id);

    // Delete verification token
    await deleteVerificationToken(user.id, 'email_verification');

    return NextResponse.json({
      message: 'Email verified successfully',
    });
  } catch {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}