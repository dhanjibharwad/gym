import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const body = await request.json();
    const { phone_number, email } = body;

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'UPDATE members SET phone_number = $1, email = $2 WHERE id = $3 RETURNING *',
        [phone_number, email || null, memberId]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Member not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Member updated successfully',
        member: result.rows[0]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update member' },
      { status: 500 }
    );
  }
}