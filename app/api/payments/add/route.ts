import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, membership_id, amount, payment_mode, payment_date, reference_number } = body;

    const session = await getSession();
    const client = await pool.connect();
    
    try {
      // Get current payment record
      const currentPayment = await client.query(
        'SELECT * FROM payments WHERE membership_id = $1',
        [membership_id]
      );
      
      if (currentPayment.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Payment record not found' },
          { status: 404 }
        );
      }
      
      const current = currentPayment.rows[0];
      const newPaidAmount = parseFloat(current.paid_amount) + parseFloat(amount);
      const totalAmount = parseFloat(current.total_amount);
      
      console.log('Payment update:', {
        currentPaid: current.paid_amount,
        addingAmount: amount,
        newPaidAmount,
        totalAmount
      });
      
      // Determine new payment status
      let newStatus = 'partial';
      if (newPaidAmount >= totalAmount) {
        newStatus = 'full';
      } else if (newPaidAmount <= 0) {
        newStatus = 'pending';
      }
      
      // Update payment record
      await client.query(
        `UPDATE payments 
         SET paid_amount = $1, payment_status = $2, payment_mode = $3
         WHERE membership_id = $4`,
        [newPaidAmount, newStatus, payment_mode, membership_id]
      );
      
      // Insert transaction record with current timestamp
      const userName = session?.user?.name || 'Reception';
      await client.query(
        `INSERT INTO payment_transactions (member_id, membership_id, transaction_type, amount, payment_mode, transaction_date, receipt_number, created_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
        [member_id, membership_id, 'additional_payment', amount, payment_mode, reference_number || null, userName]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Payment added successfully'
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error adding payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add payment' },
      { status: 500 }
    );
  }
}