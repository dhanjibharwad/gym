import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function POST(request: NextRequest) {
  try {
    // Check manage_payments permission
    const { authorized, response } = await checkPermission(request, 'manage_payments');
    if (!authorized) return response;

    const body = await request.json();
    const { member_id, membership_id, amount, payment_mode, payment_date, reference_number } = body;

    const companyId = request.headers.get('x-company-id');
    const userName = request.headers.get('x-user-name') || 'Reception';
    const userRole = request.headers.get('x-user-role') || 'staff';
    
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
        // Debug: Check if membership exists
        const membershipCheck = await client.query(
          'SELECT * FROM memberships WHERE id = $1',
          [membership_id]
        );
        
        
        if (membershipCheck.rows.length === 0) {
          // Try to find membership by member_id instead
          const memberMembershipCheck = await client.query(
            'SELECT id, plan_id FROM memberships WHERE member_id = $1 ORDER BY created_at DESC LIMIT 1',
            [member_id]
          );
          
          if (memberMembershipCheck.rows.length === 0) {
            return NextResponse.json(
              { success: false, message: 'No active membership found for this member. Please add a membership first.' },
              { status: 404 }
            );
          }
          
          // Use the found membership
          const membership = memberMembershipCheck.rows[0];
          const planResult = await client.query(
            'SELECT plan_name, price FROM membership_plans WHERE id = $1',
            [membership.plan_id]
          );
        
          if (planResult.rows.length === 0) {
            return NextResponse.json(
              { success: false, message: 'Invalid membership plan' },
              { status: 400 }
            );
          }
          
          const plan = planResult.rows[0];
          const totalAmount = parseFloat(plan.price) || 0;
          const newPaidAmount = parseFloat(amount);
          const newStatus = newPaidAmount >= totalAmount ? 'full' : newPaidAmount > 0 ? 'partial' : 'pending';
          
          // Create initial payment record
          await client.query(
            `INSERT INTO payments (membership_id, total_amount, paid_amount, payment_mode, payment_status, reference_number, next_due_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [membership.id, totalAmount, newPaidAmount, payment_mode, newStatus, reference_number || null, payment_date]
          );
          
          // Insert transaction record
          const userName = session?.user?.name || 'Reception';
          await client.query(
            `INSERT INTO payment_transactions (member_id, membership_id, transaction_type, amount, payment_mode, transaction_date, receipt_number, created_by)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
            [member_id, membership.id, 'membership_fee', amount, payment_mode, reference_number || null, userName]
          );
          
          // Get member name for audit log
          const memberResult = await client.query(
            'SELECT full_name FROM members WHERE id = $1',
            [member_id]
          );
          const memberName = memberResult.rows[0]?.full_name || 'Unknown';
          
          // Create audit log
          const userRole = session?.user?.role || 'staff';
          await client.query(
            `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              'CREATE',
              'payment',
              membership.id,
              `Initial payment of ₹${amount} for ${memberName} by ${userName}`,
              userRole,
              companyId
            ]
          );
          
          return NextResponse.json({
            success: true,
            message: 'Payment record created and payment added successfully'
          });
        } else {
          // Membership found by ID but no payment - use original membership_id from request
          const membership = membershipCheck.rows[0];
          const planResult = await client.query(
            'SELECT plan_name, price FROM membership_plans WHERE id = $1',
            [membership.plan_id]
          );
          
          if (planResult.rows.length === 0) {
            return NextResponse.json(
              { success: false, message: 'Invalid membership plan' },
              { status: 400 }
            );
          }
          
          const plan = planResult.rows[0];
          const totalAmount = parseFloat(plan.price) || 0;
          const newPaidAmount = parseFloat(amount);
          const newStatus = newPaidAmount >= totalAmount ? 'full' : newPaidAmount > 0 ? 'partial' : 'pending';
          
          // Create initial payment record
          await client.query(
            `INSERT INTO payments (membership_id, total_amount, paid_amount, payment_mode, payment_status, reference_number, next_due_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [membership_id, totalAmount, newPaidAmount, payment_mode, newStatus, reference_number || null, payment_date]
          );
          
          // Insert transaction record
          const userName = session?.user?.name || 'Reception';
          await client.query(
            `INSERT INTO payment_transactions (member_id, membership_id, transaction_type, amount, payment_mode, transaction_date, receipt_number, created_by)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
            [member_id, membership_id, 'membership_fee', amount, payment_mode, reference_number || null, userName]
          );
          
          // Get member name for audit log
          const memberResult = await client.query(
            'SELECT full_name FROM members WHERE id = $1',
            [member_id]
          );
          const memberName = memberResult.rows[0]?.full_name || 'Unknown';
          
          // Create audit log
          const userRole = session?.user?.role || 'staff';
          await client.query(
            `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              'CREATE',
              'payment',
              membership_id,
              `Initial payment of ₹${amount} for ${memberName} by ${userName}`,
              userRole,
              companyId
            ]
          );
          
          return NextResponse.json({
            success: true,
            message: 'Payment record created and payment added successfully'
          });
        }
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
      
      // Get member name for audit log
      const memberResult = await client.query(
        'SELECT full_name FROM members WHERE id = $1',
        [member_id]
      );
      const memberName = memberResult.rows[0]?.full_name || 'Unknown';
      
      // Create audit log for payment
      const userRole = session?.user?.role || 'staff';
      await client.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'CREATE',
          'payment',
          membership_id,
          `Payment of ₹${amount} added for ${memberName} by ${userName}`,
          userRole,
          companyId
        ]
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
