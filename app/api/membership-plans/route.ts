import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          plan_name,
          duration_months,
          price,
          created_at
        FROM membership_plans
        ORDER BY duration_months ASC
      `);
      
      return NextResponse.json({
        success: true,
        plans: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { plan_name, duration_months, price } = await request.json();
    
    if (!plan_name || !duration_months || !price) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }
    
    const session = await getSession();
    const userRole = request.headers.get('referer')?.includes('/admin/') ? 'admin' : 'reception';
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'INSERT INTO membership_plans (plan_name, duration_months, price) VALUES ($1, $2, $3) RETURNING *',
        [plan_name, duration_months, price]
      );
      
      // Log the action
      const userName = session?.user?.name || 'Unknown User';
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8004'}/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          entity_type: 'membership_plan',
          entity_id: result.rows[0].id,
          details: `Created plan by (${userName}): ${plan_name} (${duration_months} months, ₹${price})`,
          user_role: userRole
        })
      });
      
      return NextResponse.json({
        success: true,
        plan: result.rows[0]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Plan name already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, plan_name, duration_months, price } = await request.json();
    
    if (!id || !plan_name || !duration_months || !price) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }
    
    const session = await getSession();
    const userRole = request.headers.get('referer')?.includes('/admin/') ? 'admin' : 'reception';
    
    const client = await pool.connect();
    
    try {
      // Get old plan details for logging
      const oldPlan = await client.query('SELECT * FROM membership_plans WHERE id = $1', [id]);
      
      const result = await client.query(
        'UPDATE membership_plans SET plan_name = $1, duration_months = $2, price = $3 WHERE id = $4 RETURNING *',
        [plan_name, duration_months, price, id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Plan not found' },
          { status: 404 }
        );
      }
      
      // Log the action
      if (oldPlan.rows.length > 0) {
        const old = oldPlan.rows[0];
        const userName = session?.user?.name || 'Unknown User';
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8004'}/api/audit-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE',
            entity_type: 'membership_plan',
            entity_id: id,
            details: `Updated plan by (${userName}): ${old.plan_name} → ${plan_name}, ${old.duration_months}m → ${duration_months}m, ₹${old.price} → ₹${price}`,
            user_role: userRole
          })
        });
      }
      
      return NextResponse.json({
        success: true,
        plan: result.rows[0]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Plan name already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Plan ID is required' },
        { status: 400 }
      );
    }
    
    const session = await getSession();
    const userRole = request.headers.get('referer')?.includes('/admin/') ? 'admin' : 'reception';
    
    const client = await pool.connect();
    
    try {
      // Check if plan is being used by any memberships
      const membershipCheck = await client.query(
        'SELECT COUNT(*) FROM memberships WHERE plan_id = $1',
        [id]
      );
      
      if (parseInt(membershipCheck.rows[0].count) > 0) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete plan that is being used by members' },
          { status: 400 }
        );
      }
      
      // Get plan details for logging
      const planDetails = await client.query('SELECT * FROM membership_plans WHERE id = $1', [id]);
      
      const result = await client.query(
        'DELETE FROM membership_plans WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Plan not found' },
          { status: 404 }
        );
      }
      
      // Log the action
      if (planDetails.rows.length > 0) {
        const plan = planDetails.rows[0];
        const userName = session?.user?.name || 'Unknown User';
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8004'}/api/audit-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DELETE',
            entity_type: 'membership_plan',
            entity_id: id,
            details: `Deleted plan by (${userName}): ${plan.plan_name} (${plan.duration_months} months, ₹${plan.price})`,
            user_role: userRole
          })
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Plan deleted successfully'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
}