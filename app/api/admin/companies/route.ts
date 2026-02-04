import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Get all pending companies for super admin
export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.status,
          c.created_at,
          u.name as admin_name,
          u.email as admin_email
        FROM companies c
        LEFT JOIN users u ON c.id = u.company_id AND u.role_id IN (
          SELECT id FROM roles WHERE company_id = c.id AND name = 'Admin'
        )
        WHERE c.status = 'pending'
        ORDER BY c.created_at DESC
      `);

      return NextResponse.json({
        companies: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching pending companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}