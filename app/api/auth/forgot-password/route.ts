import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createVerificationToken, getUserByEmail } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await getUserByEmail(normalizedEmail);

    // Don't reveal if user exists for security
    if (!user) {
      return NextResponse.json({
        message: 'If account exists, reset email will be sent',
      });
    }

    // Create reset token
    const otp = await createVerificationToken(user.id, 'password_reset');

    // Send password reset email
    try {
      await sendPasswordResetEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'If account exists, reset email will be sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}