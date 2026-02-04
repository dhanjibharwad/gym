import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, createSession, updateLastLogin, getUserByEmail, getCompanyBySubdomain } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, subdomain } = await request.json();

    // Validate required fields
    if (!email || !password || !subdomain) {
      return NextResponse.json(
        { error: 'Email, password, and company subdomain are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Get company by subdomain
    const company = await getCompanyBySubdomain(normalizedSubdomain);
    if (!company) {
      return NextResponse.json(
        { error: 'Invalid company' },
        { status: 401 }
      );
    }

    // Get user by email and company
    const user = await getUserByEmail(normalizedEmail, company.id);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
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
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
      },
      token,
    });

  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}