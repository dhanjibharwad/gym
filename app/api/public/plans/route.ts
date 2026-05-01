import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      // Fetch plans from the first active company found
      // In a real multi-tenant app, you'd filter by subdomain or a specific ID
      const result = await client.query(`
        SELECT 
          id,
          plan_name,
          duration_months,
          price
        FROM membership_plans
        WHERE company_id = (SELECT id FROM companies ORDER BY id ASC LIMIT 1)
        ORDER BY price ASC
      `);
      
      return NextResponse.json({
        success: true,
        plans: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Public plans API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
