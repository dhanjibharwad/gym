import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, createVerificationToken } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }

    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, lowercase letter, number, and special character' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]{10,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with default role 'reception'
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, role`,
      [name.trim(), normalizedEmail, phone?.trim() || null, hashedPassword, 'reception', false]
    );

    const newUser = result.rows[0];

    // Create verification token
    const otp = await createVerificationToken(newUser.id, 'email_verification');

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, otp);
    } catch {
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email for verification.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}