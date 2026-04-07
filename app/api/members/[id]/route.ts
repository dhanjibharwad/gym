import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';
import { unstable_cache, revalidateTag } from 'next/cache';
import { getSession } from '@/lib/auth';

// Cached function for fetching member details
const getCachedMemberDetails = unstable_cache(
  async (memberId: string, companyId: string) => {
    const client = await pool.connect();
    
    try {
      // Get member details with company verification
      const memberResult = await client.query(
        `SELECT id, member_number, member_number as formatted_member_id,
                full_name, phone_number, email, gender, date_of_birth, 
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))::int as age,
                occupation, address, emergency_contact_name, emergency_contact_phone,
                profile_photo_url, created_at
         FROM members 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [memberId, companyId]
      );
      
      if (memberResult.rows.length === 0) {
        return null;
      }
      
      // Run all other queries in parallel for better performance
      const [
        membershipsResult,
        holdHistoryResult,
        paymentsResult,
        transactionsResult,
        medicalResult,
        paymentSummaryResult
      ] = await Promise.all([
        // Get memberships with plan details
        client.query(
          `SELECT ms.*, mp.plan_name, mp.duration_months, mp.price as plan_price,
           u.name as created_by_name
           FROM memberships ms
           LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
           LEFT JOIN users u ON ms.created_by = u.id
           WHERE ms.member_id = $1
           ORDER BY ms.start_date DESC`,
          [memberId]
        ),
        // Get hold history for each membership
        client.query(
          `SELECT mh.*, ms.member_id
           FROM membership_holds mh
           JOIN memberships ms ON mh.membership_id = ms.id
           WHERE ms.member_id = $1
           ORDER BY mh.created_at DESC`,
          [memberId]
        ),
        // Get payments
        client.query(
          `SELECT p.id, p.membership_id, p.total_amount, p.paid_amount, 
                  p.payment_mode, p.payment_status, p.next_due_date, p.created_at
           FROM payments p
           JOIN memberships ms ON p.membership_id = ms.id
           WHERE ms.member_id = $1
           ORDER BY p.created_at DESC`,
          [memberId]
        ),
        // Get payment transactions
        client.query(
          `SELECT pt.id, pt.payment_id, pt.member_id, pt.membership_id,
                  pt.transaction_type, pt.amount, pt.payment_mode, pt.payment_status,
                  pt.transaction_date, pt.description, pt.receipt_number, 
                  p.reference_number
           FROM payment_transactions pt
           LEFT JOIN payments p ON pt.payment_id = p.id
           WHERE pt.member_id = $1
           ORDER BY pt.transaction_date DESC
           LIMIT 100`,
          [memberId]
        ),
        // Get medical info
        client.query(
          `SELECT id, member_id, medical_conditions, injuries_limitations, 
                  additional_notes, created_at, updated_at
           FROM medical_info WHERE member_id = $1`,
          [memberId]
        ),
        // Get payment summary
        client.query(
          `SELECT id, member_id, total_paid, total_pending, 
                  last_payment_date, last_payment_amount, payment_count
           FROM member_payment_summary WHERE member_id = $1`,
          [memberId]
        )
      ]);
      
      // Group hold history by membership_id
      const holdHistoryMap = new Map();
      holdHistoryResult.rows.forEach(hold => {
        if (!holdHistoryMap.has(hold.membership_id)) {
          holdHistoryMap.set(hold.membership_id, []);
        }
        holdHistoryMap.get(hold.membership_id).push(hold);
      });
      
      // Add hold history to memberships
      const membershipsWithHistory = membershipsResult.rows.map(membership => ({
        ...membership,
        hold_history: holdHistoryMap.get(membership.id) || []
      }));
      
      return {
        member: memberResult.rows[0],
        memberships: membershipsWithHistory,
        payments: paymentsResult.rows,
        transactions: transactionsResult.rows,
        medicalInfo: medicalResult.rows[0] || null,
        paymentSummary: paymentSummaryResult.rows[0] || null
      };
      
    } finally {
      client.release();
    }
  },
  ['member-details'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['member']
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const companyId = request.headers.get('x-company-id');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
        { status: 400 }
      );
    }
    
    // Use cached function for better performance
    const data = await getCachedMemberDetails(memberId, companyId);
    
    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Member not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ...data
    });
    
  } catch (error) {
    console.error('Get member error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/members/[id]
 * Updates member details. Requires 'edit_members' permission.
 * Can update: full_name, phone_number, email, gender, date_of_birth,
 * occupation, address, emergency_contact_name, emergency_contact_phone,
 * and medical information (medical_conditions, injuries_limitations, additional_notes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check edit_members permission - rejects if user doesn't have this permission
    const { authorized, response } = await checkPermission(request, 'edit_members');
    if (!authorized) return response;

    const { id: memberId } = await params;
    const body = await request.json();
    const {
      full_name,
      phone_number,
      email,
      gender,
      date_of_birth,
      occupation,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      medical_conditions,
      injuries_limitations,
      additional_notes
    } = body;
    const companyId = request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update member basic info
      const memberResult = await client.query(
        `UPDATE members SET
          full_name = COALESCE($1, full_name),
          phone_number = COALESCE($2, phone_number),
          email = $3,
          gender = COALESCE($4, gender),
          date_of_birth = COALESCE($5, date_of_birth),
          occupation = COALESCE($6, occupation),
          address = COALESCE($7, address),
          emergency_contact_name = COALESCE($8, emergency_contact_name),
          emergency_contact_phone = COALESCE($9, emergency_contact_phone)
        WHERE id = $10 AND company_id = $11 AND deleted_at IS NULL
        RETURNING *`,
        [
          full_name,
          phone_number,
          email || null,
          gender,
          date_of_birth,
          occupation,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          memberId,
          companyId
        ]
      );

      if (memberResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, message: 'Member not found' },
          { status: 404 }
        );
      }

      // Update or insert medical info if any medical fields are provided
      if (medical_conditions !== undefined || injuries_limitations !== undefined || additional_notes !== undefined) {
        // Check if medical info exists for this member
        const existingMedical = await client.query(
          'SELECT id FROM medical_info WHERE member_id = $1',
          [memberId]
        );

        if (existingMedical.rows.length > 0) {
          // Update existing medical info
          await client.query(
            `UPDATE medical_info SET
              medical_conditions = COALESCE($1, medical_conditions),
              injuries_limitations = COALESCE($2, injuries_limitations),
              additional_notes = COALESCE($3, additional_notes),
              updated_at = CURRENT_TIMESTAMP
            WHERE member_id = $4`,
            [medical_conditions, injuries_limitations, additional_notes, memberId]
          );
        } else {
          // Insert new medical info
          await client.query(
            `INSERT INTO medical_info (member_id, medical_conditions, injuries_limitations, additional_notes)
             VALUES ($1, $2, $3, $4)`,
            [memberId, medical_conditions, injuries_limitations, additional_notes]
          );
        }
      }

      // Create audit log for member update
      const session = await getSession();
      const userName = session?.user?.name || 'Unknown';
      const userRole = session?.user?.role || 'staff';
      await client.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'UPDATE',
          'member',
          memberId,
          `Member ${memberResult.rows[0].full_name} updated by ${userName}`,
          userRole,
          companyId
        ]
      );

      await client.query('COMMIT');
      
      // Revalidate cache
      revalidateTag('member');
      revalidateTag('members');

      return NextResponse.json({
        success: true,
        message: 'Member updated successfully',
        member: memberResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkPermission(request, 'delete_members');
    if (!authorized) return response;

    const { id: memberId } = await params;
    const companyId = request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID required' }, { status: 400 });
    }

    // Soft delete — set deleted_at timestamp
    // First ensure column exists (in case migration hasn't run yet)
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`).catch(() => {});

    const result = await pool.query(
      `UPDATE members SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING id, full_name`,
      [memberId, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });
    }

    // Audit log
    const session = await getSession();
    await pool.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['DELETE', 'member', memberId,
       `Member ${result.rows[0].full_name} deleted by ${session?.user?.name || 'Unknown'}`,
       session?.user?.role || 'staff', companyId]
    );

    revalidateTag('member');
    revalidateTag('members');

    return NextResponse.json({ success: true, message: 'Member deleted successfully' });

  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete member' }, { status: 500 });
  }
}