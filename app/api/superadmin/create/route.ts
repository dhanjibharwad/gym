import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create superadmin company
      const companyResult = await client.query(
        `INSERT INTO companies (name, email, status, subscription_status) 
         VALUES ($1, $2, 'approved', 'active') RETURNING *`,
        ['SuperAdmin', email]
      );
      const company = companyResult.rows[0];

      // Create SuperAdmin role
      const roleResult = await client.query(
        `INSERT INTO roles (company_id, name, description, is_system_role) 
         VALUES ($1, 'SuperAdmin', 'System super administrator', true) RETURNING *`,
        [company.id]
      );
      const role = roleResult.rows[0];

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create superadmin user
      await client.query(
        `INSERT INTO users (company_id, role_id, email, password, name, is_verified) 
         VALUES ($1, $2, $3, $4, $5, true)`,
        [company.id, role.id, email.toLowerCase().trim(), hashedPassword, name]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'SuperAdmin created successfully'
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('SuperAdmin creation error:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}