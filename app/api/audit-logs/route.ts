import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { action, entity_type, entity_id, details, user_role } = await request.json();
    
    const client = await pool.connect();
    
    try {
      await client.query(
        'INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role) VALUES ($1, $2, $3, $4, $5)',
        [action, entity_type, entity_id, details, user_role]
      );
      
      return NextResponse.json({ success: true });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          id,
          action,
          entity_type,
          entity_id,
          details,
          user_role,
          created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      return NextResponse.json({
        success: true,
        logs: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Database error' },
      { status: 500 }
    );
  }
}