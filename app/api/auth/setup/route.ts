import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    // Check if any admin exists
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      ['admin']
    );

    const adminExists = parseInt(result.rows[0].count) > 0;

    return NextResponse.json({
      adminExists,
      needsSetup: !adminExists
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { error: 'Setup check failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    // Lock the users table to prevent concurrent writes during this check
    await client.query('LOCK TABLE users IN EXCLUSIVE MODE');

    // Check if admin already exists
    const adminCheck = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      ['admin']
    );

    if (parseInt(adminCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Admin already exists' },
        { status: 400 }
      );
    }

    const { name, email, password } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user (verified by default)
    const result = await client.query(
      `INSERT INTO users (name, email, password, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role`,
      [name.trim(), normalizedEmail, hashedPassword, 'admin', true]
    );

    await client.query('COMMIT');

    const newAdmin = result.rows[0];

    return NextResponse.json({
      message: 'Admin created successfully',
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Admin setup failed' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}