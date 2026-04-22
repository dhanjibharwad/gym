import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

interface BulkMembershipAssignment {
  memberIds: number[];
  planId: number;
  startDate: string;
  endDate?: string;
  trainerAssigned?: string;
  batchTime?: string;
  membershipTypes?: string[];
  referenceOfAdmission?: string;
  notes?: string;
}

interface BulkPaymentAssignment {
  membershipIds: number[];
  totalAmount: number;
  amountPaid: number;
  paymentMode: string;
  referenceNumber?: string;
  nextDueDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      members, 
      membership, 
      payment,
      assignMembership = false,
      processPayment = false 
    } = body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No members provided' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let successCount = 0;
    let errors: string[] = [];

    try {
      await client.query('BEGIN');

      // Process each member
      for (const memberData of members) {
        try {
          const { memberId } = memberData;
          
          // Verify member belongs to company and is not deleted
          const memberCheck = await client.query(
            'SELECT id, full_name FROM members WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
            [memberId, session.user.companyId]
          );

          if (memberCheck.rows.length === 0) {
            errors.push(`Member ID ${memberId} not found or unauthorized`);
            continue;
          }

          const memberName = memberCheck.rows[0].full_name;
          let membershipId: number | null = null;

          // Assign membership if requested
          if (assignMembership && membership) {
            const planResult = await client.query(
              'SELECT id, plan_name, duration_months FROM membership_plans WHERE id = $1 AND company_id = $2',
              [membership.planId, session.user.companyId]
            );

            if (planResult.rows.length === 0) {
              errors.push(`Invalid plan for member ${memberName}`);
              continue;
            }

            // Calculate end date if not provided
            let endDate = membership.endDate;
            if (!endDate) {
              const startDate = new Date(membership.startDate);
              const calculatedEndDate = new Date(startDate);
              calculatedEndDate.setMonth(calculatedEndDate.getMonth() + planResult.rows[0].duration_months);
              endDate = calculatedEndDate.toISOString().split('T')[0];
            }

            // Insert membership
            const membershipResult = await client.query(
              `INSERT INTO memberships (
                member_id, plan_id, start_date, end_date, trainer_assigned,
                batch_time, membership_types, reference_of_admission, notes, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
              [
                memberId,
                membership.planId,
                membership.startDate,
                endDate,
                membership.trainerAssigned || null,
                membership.batchTime || null,
                membership.membershipTypes ? membership.membershipTypes.join(',') : null,
                membership.referenceOfAdmission || null,
                membership.notes || null,
                session.user.id
              ]
            );

            membershipId = membershipResult.rows[0].id;
          }

          // Process payment if requested and membership exists
          if (processPayment && payment && membershipId) {
            const paymentStatus = payment.amountPaid >= payment.totalAmount ? 'full' :
              payment.amountPaid > 0 ? 'partial' : 'pending';

            await client.query(
              `INSERT INTO payments (
                membership_id, total_amount, paid_amount, payment_mode,
                payment_status, reference_number, next_due_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                membershipId,
                payment.totalAmount,
                payment.amountPaid,
                payment.paymentMode,
                paymentStatus,
                payment.referenceNumber || null,
                payment.nextDueDate || null
              ]
            );

            // Create payment transaction if amount was paid
            if (payment.amountPaid > 0) {
              await client.query(
                `INSERT INTO payment_transactions (
                  member_id, membership_id, transaction_type, amount, payment_mode, transaction_date, created_by
                ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
                [
                  memberId,
                  membershipId,
                  'membership_fee',
                  payment.amountPaid,
                  payment.paymentMode,
                  session.user.name || 'Unknown'
                ]
              );
            }
          } else if (membershipId) {
            // Even if no payment is being processed, create a payment record with 0 paid
            // This ensures the member shows up in the payments list
            const planResult = await client.query(
              'SELECT plan_name, price FROM membership_plans WHERE id = $1',
              [membership.planId]
            );
            
            if (planResult.rows.length > 0) {
              const planAmount = parseFloat(planResult.rows[0].price) || 0;
              
              await client.query(
                `INSERT INTO payments (
                  membership_id, total_amount, paid_amount, payment_mode,
                  payment_status, reference_number, next_due_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  membershipId,
                  planAmount,
                  0, // No payment made yet
                  'Cash',
                  'pending',
                  null,
                  membership.startDate // Use start date as next due date
                ]
              );
            }
          }

          successCount++;

        } catch (error) {
          console.error('Error processing member:', error);
          errors.push(`Error processing member ${memberData.memberId}: ${(error as Error).message}`);
        }
      }

      await client.query('COMMIT');

      // Invalidate payments cache to refresh the list
      const { cache } = await import('@/lib/cache/MemoryCache');
      const paymentCacheKey = `payments:list:${session.user.companyId}:1:20:::`;
      cache.delete(paymentCacheKey);

      return NextResponse.json({
        success: true,
        message: `Processed ${members.length} members: ${successCount} successful, ${errors.length} failed`,
        successCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in bulk membership assignment:', error);
    return NextResponse.json(
      { success: false, message: 'Error processing bulk assignment: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Get available membership plans for the company
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, plan_name, duration_months, price FROM membership_plans WHERE company_id = $1 ORDER BY plan_name',
        [session.user.companyId]
      );

      return NextResponse.json({
        success: true,
        plans: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching membership plans:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching membership plans' },
      { status: 500 }
    );
  }
}
