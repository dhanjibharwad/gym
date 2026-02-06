import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    client = await pool.connect();
    
    // Get members data only from members table
    const result = await client.query(`
      SELECT * FROM members
      ORDER BY created_at DESC
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