import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkPermission } from '@/lib/api-permissions';

export async function POST(request: NextRequest) {
  try {
    // Check manage_payments permission
    const { authorized, response } = await checkPermission(request, 'manage_payments');
    if (!authorized) return response;

    const body = await request.json();
    const { member_id, membership_id, amount, payment_mode, payment_date, reference_number } = body;

    const session = await getSession();
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      // Get current payment record with company verification
      const currentPayment = await client.query(
        `SELECT p.* FROM payments p
         JOIN memberships m ON p.membership_id = m.id
         JOIN members mem ON m.member_id = mem.id
         WHERE p.membership_id = $1 AND mem.company_id = $2`,
        [membership_id, companyId]
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
      
      // Update payment record (keep original payment_mode)
      await client.query(
        `UPDATE payments 
         SET paid_amount = $1, payment_status = $2
         WHERE membership_id = $3`,
        [newPaidAmount, newStatus, membership_id]
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