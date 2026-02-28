import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.name, c.email, c.status, c.created_at, c.subscription_plan_id,
        u.name as admin_name, u.phone as admin_phone,
        sp.name as plan_name, sp.price as plan_price, sp.billing_period
      FROM companies c
      JOIN users u ON c.id = u.company_id
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN subscription_plans sp ON c.subscription_plan_id = sp.id
      WHERE r.name = 'Admin'
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({
      companies: result.rows
    });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { companyId, action } = await request.json();

    if (!companyId || !action) {
      return NextResponse.json(
        { error: 'Company ID and action are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      if (action === 'approve') {
        // Update company status to approved
        await client.query(
          'UPDATE companies SET status = $1 WHERE id = $2',
          ['approved', companyId]
        );

        // Verify admin user
        await client.query(`
          UPDATE users SET is_verified = true 
          WHERE company_id = $1 AND role_id IN (
            SELECT id FROM roles WHERE company_id = $1 AND name = 'Admin'
          )
        `, [companyId]);

      } else if (action === 'reject') {
        // Update company status to rejected
        await client.query(
          'UPDATE companies SET status = $1 WHERE id = $2',
          ['rejected', companyId]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        message: `Company ${action}d successfully`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to update company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}