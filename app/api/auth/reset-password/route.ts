import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, deleteVerificationToken, deleteAllUserSessions, getUserByEmail, verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Verify OTP token
    const isValidToken = await verifyToken(user.id, otp, 'password_reset');

    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Delete verification token
    await deleteVerificationToken(user.id, 'password_reset');

    // Delete all user sessions to force re-login
    await deleteAllUserSessions(user.id);

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Reset failed' },
      { status: 500 }
    );
  }
}