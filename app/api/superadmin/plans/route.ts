import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, name, price, billing_period, details, created_at, updated_at
      FROM subscription_plans
      ORDER BY billing_period, price ASC
    `);

    return NextResponse.json({ plans: result.rows });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, price, billing_period, details } = await request.json();

    if (!name || price === undefined || !billing_period || !details) {
      return NextResponse.json({ error: 'Name, price, billing period, and details are required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO subscription_plans (name, price, billing_period, details) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, price, billing_period, details]
    );

    return NextResponse.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('Failed to create plan:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, price, billing_period, details } = await request.json();

    if (!id || !name || price === undefined || !billing_period || !details) {
      return NextResponse.json({ error: 'ID, name, price, billing period, and details are required' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE subscription_plans 
       SET name = $1, price = $2, billing_period = $3, details = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING *`,
      [name, price, billing_period, details, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('Failed to update plan:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM subscription_plans WHERE id = $1', [id]);

    return NextResponse.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Failed to delete plan:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
