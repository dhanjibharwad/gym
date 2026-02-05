import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, createSession, updateLastLogin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user by email (without company restriction)
    const client = await pool.connect();
    try {
      const userResult = await client.query(
        `SELECT u.*, c.name as company_name, c.subdomain, c.status as company_status, r.name as role 
         FROM users u 
         JOIN companies c ON u.company_id = c.id 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.email = $1`,
        [normalizedEmail]
      );
      
      const user = userResult.rows[0];
      if (!user) {
        // Check if user's email domain matches any registered company
        const emailDomain = normalizedEmail.split('@')[1];
        const companyResult = await client.query(
          `SELECT id, name FROM companies WHERE email LIKE $1 AND is_active = true`,
          [`%@${emailDomain}`]
        );
        
        if (companyResult.rows.length > 0) {
          return NextResponse.json(
            { 
              error: 'User not registered',
              code: 'USER_CAN_REGISTER',
              availableCompanies: companyResult.rows.map(company => ({
                id: company.id,
                name: company.name
              }))
            },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Check company status
      if (user.company_status === 'pending') {
        return NextResponse.json(
          { 
            error: 'Your company registration is pending approval. Please wait for admin verification.',
            code: 'COMPANY_PENDING'
          },
          { status: 403 }
        );
      }

      if (user.company_status === 'rejected') {
        return NextResponse.json(
          { 
            error: 'Your company registration has been rejected. Please contact support.',
            code: 'COMPANY_REJECTED'
          },
          { status: 403 }
        );
      }

      if (user.company_status !== 'approved') {
        return NextResponse.json(
          { 
            error: 'Your company status is invalid. Please contact support.',
            code: 'COMPANY_INVALID_STATUS'
          },
          { status: 403 }
        );
      }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.is_verified) {
      return NextResponse.json(
        { 
          error: 'Please verify your email before logging in',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      );
    }

      // Create session with company context
      const token = await createSession(user.id, user.company_id, user.role);

      // Update last login timestamp
      await updateLastLogin(user.id);

      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: user.id,
          companyId: user.company_id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        company: {
          id: user.company_id,
          name: user.company_name,
          subdomain: user.subdomain,
        },
        token,
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}