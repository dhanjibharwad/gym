import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { createAuditLog } from '@/lib/audit-logger';
import { cache } from '@/lib/cache/MemoryCache';
import { sendStaffEmail } from '@/lib/staff-email';

export async function POST(request: NextRequest) {
  try {
    // Check add_staff permission
    const auth = await checkPermission(request, 'add_staff');
    if (!auth.authorized) {
      return auth.response;
    }

    const { name, email, roleId, password } = await request.json();

    // Validate required fields
    if (!name || !email || !roleId || !password) {
      return NextResponse.json(
        { error: 'Name, email, role, and password are required' },
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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in the same company
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND company_id = $2',
      [normalizedEmail, auth.session!.user.companyId]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Validate role exists in company
    const roleResult = await pool.query(
      'SELECT id, name FROM roles WHERE company_id = $1 AND id = $2',
      [auth.session!.user.companyId, roleId]
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid role selected' },
        { status: 400 }
      );
    }

    const selectedRole = roleResult.rows[0];

    // Create staff user with plain-text password
    const result = await pool.query(
      `INSERT INTO users (company_id, role_id, name, email, password, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name`,
      [auth.session!.user.companyId, roleId, name.trim(), normalizedEmail, password, true]
    );

    const newUser = result.rows[0];

    // Log staff creation in audit logs
    await createAuditLog({
      companyId: auth.session!.user.companyId,
      action: 'CREATE',
      entityType: 'staff',
      entityId: newUser.id,
      details: `Staff member "${name.trim()}" (${normalizedEmail}) added with role "${selectedRole.name}" by ${auth.session!.user.name}`,
      userRole: auth.session!.user.role,
      userId: auth.session!.user.id
    });

    // Invalidate staff cache
    cache.delete(`staff:list:v2:${auth.session!.user.companyId}`);

    // Send email with login credentials
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? `https://${process.env.NEXT_PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}`
      : process.env.NEXTAUTH_URL || 'http://localhost:8004';
    const loginUrl = baseUrl;
    const { sent: emailSent, error: emailErrorMsg } = await sendStaffEmail(
      auth.session!.user.companyId,
      normalizedEmail,
      'Welcome to Our Gym - Your Login Credentials',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#ea580c">Welcome to Our Gym!</h2>
        <p>Hello ${name.trim()},</p>
        <p>You have been added as a <strong>${selectedRole.name}</strong> staff member. Here are your login credentials:</p>
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
          <p><strong>Login URL:</strong> <a href="${loginUrl}/auth/login">${loginUrl}/auth/login</a></p>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Password:</strong> <code style="background:#e5e7eb;padding:4px 8px;border-radius:4px">${password}</code></p>
        </div>
        <p>Best regards,<br>Gym Management Team</p>
      </div>`
    );

    return NextResponse.json({
      message: 'Staff member added successfully',
      emailSent,
      ...(emailErrorMsg && { emailError: emailErrorMsg }),
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: selectedRole.name,
      },
    });

  } catch (error) {
    console.error('Add staff error:', error);
    return NextResponse.json(
      { error: 'Failed to add staff member' },
      { status: 500 }
    );
  }
}
