import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    client = await pool.connect();
    
    // Get members data with their latest membership status
    const result = await client.query(`
      SELECT 
        m.*,
        ms.status as membership_status,
        ms.end_date,
        mp.plan_name
      FROM members m
      LEFT JOIN LATERAL (
        SELECT ms.status, ms.end_date, ms.plan_id
        FROM memberships ms
        WHERE ms.member_id = m.id
        ORDER BY ms.created_at DESC
        LIMIT 1
      ) ms ON true
      LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
      ORDER BY m.created_at DESC
    `);
    
    return NextResponse.json({
      success: true,
      members: result.rows
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database connection failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}