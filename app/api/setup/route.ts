import { NextRequest, NextResponse } from 'next/server';
import { createCompany, hashPassword } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { companyName, subdomain, adminEmail, adminPassword, adminName } = await request.json();

    // Validate required fields
    if (!companyName || !subdomain || !adminEmail || !adminPassword || !adminName) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create company with minimal fields
      const companyResult = await client.query(
        `INSERT INTO companies (name, subdomain, email, subscription_status, trial_ends_at) 
         VALUES ($1, $2, $3, 'trial', NOW() + INTERVAL '30 days') RETURNING *`,
        [companyName, subdomain, adminEmail]
      );
      const company = companyResult.rows[0];

      // Create Admin role for the company
      const roleResult = await client.query(
        `INSERT INTO roles (company_id, name, description, is_system_role) 
         VALUES ($1, 'Admin', 'Full system administrator', true) RETURNING *`,
        [company.id]
      );
      const adminRole = roleResult.rows[0];

      // Hash admin password
      const hashedPassword = await hashPassword(adminPassword);

      // Create admin user with proper role
      const userResult = await client.query(
        `INSERT INTO users (company_id, role_id, email, password, name, is_verified) 
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [company.id, adminRole.id, adminEmail.toLowerCase().trim(), hashedPassword, adminName]
      );

      // Create default membership plans for the company
      await client.query(
        `INSERT INTO membership_plans (company_id, plan_name, duration_months, price) VALUES
         ($1, 'Monthly', 1, 1500.00),
         ($1, '3 Months', 3, 4000.00),
         ($1, '6 Months', 6, 7500.00),
         ($1, '1 Year', 12, 14000.00)`,
        [company.id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Company setup completed successfully',
        company: {
          id: company.id,
          name: company.name,
          subdomain: company.subdomain,
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
      if (error.constraint?.includes('subdomain')) {
        return NextResponse.json(
          { error: 'Subdomain already exists' },
          { status: 409 }
        );
      }
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