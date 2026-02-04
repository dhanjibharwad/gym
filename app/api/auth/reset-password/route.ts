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

    // Use database transaction for atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update password
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );

      // Delete verification token
      await client.query(
        'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
        [user.id, 'password_reset']
      );

      // Delete all user sessions to force re-login
      await client.query(
        'DELETE FROM sessions WHERE user_id = $1',
        [user.id]
      );

      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch {
    return NextResponse.json(
      { error: 'Reset failed' },
      { status: 500 }
    );
  }
}