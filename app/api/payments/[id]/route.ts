import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = parseInt(id);
    const { paid_amount, payment_mode, payment_status, next_due_date } = await request.json();

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `UPDATE payments 
         SET paid_amount = $1, payment_mode = $2, payment_status = $3, next_due_date = $4
         WHERE id = $5
         RETURNING *`,
        [paid_amount, payment_mode, payment_status, next_due_date || null, paymentId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Payment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payment updated successfully',
        payment: result.rows[0]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update payment' },
      { status: 500 }
    );
  }
}