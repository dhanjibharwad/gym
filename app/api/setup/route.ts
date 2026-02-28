import { NextRequest, NextResponse } from 'next/server';
import { createCompany, hashPassword } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { companyName, adminEmail, adminPassword, adminName, adminPhone, subscriptionPlanId } = await request.json();

    // Validate required fields
    if (!companyName || !adminEmail || !adminPassword || !adminName || !adminPhone || !subscriptionPlanId) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Check if email already exists in users table
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [adminEmail.trim()]
      );
      
      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      await client.query('BEGIN');

      // Create company in pending status (no subdomain until approved)
      const companyResult = await client.query(
        `INSERT INTO companies (name, email, status, subscription_status, subscription_plan_id, trial_ends_at) 
         VALUES ($1, $2, 'pending', 'trial', $3, NOW() + INTERVAL '30 days') RETURNING *`,
        [companyName, adminEmail, subscriptionPlanId]
      );
      const company = companyResult.rows[0];

      // Create Admin role for the company
      const adminRoleResult = await client.query(
        `INSERT INTO roles (company_id, name, description, is_system_role) 
         VALUES ($1, 'Admin', 'Full system administrator', true) RETURNING *`,
        [company.id]
      );
      const adminRole = adminRoleResult.rows[0];

      // Create Staff role for the company
      await client.query(
        `INSERT INTO roles (company_id, name, description, is_system_role) 
         VALUES ($1, 'Staff', 'General staff member', true)`,
        [company.id]
      );

      // Hash admin password
      const hashedPassword = await hashPassword(adminPassword);

      // Create admin user with proper role (not verified until company is approved)
      const userResult = await client.query(
        `INSERT INTO users (company_id, role_id, email, password, name, phone, is_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
        [company.id, adminRole.id, adminEmail.toLowerCase().trim(), hashedPassword, adminName, adminPhone]
      );

      // Create default membership plans for the company
      await client.query(
        `INSERT INTO membership_plans (company_id, plan_name, duration_months, price, base_duration_months, base_price) VALUES
         ($1, 'Monthly', 1, 1500.00, 1, 1500.00),
         ($1, '3 Months', 3, 4000.00, 3, 4000.00),
         ($1, '6 Months', 6, 7500.00, 6, 7500.00),
         ($1, '1 Year', 12, 14000.00, 12, 14000.00)`,
        [company.id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Company registration submitted successfully. Your account is pending approval from our team.',
        company: {
          id: company.id,
          name: company.name,
          status: company.status
        },
        admin: {
          id: userResult.rows[0].id,
          email: userResult.rows[0].email,
          name: userResult.rows[0].name,
        }
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Setup error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}