import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

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
    
    const client = await pool.connect();
    
    try {
      // Get member details with company verification
      const memberResult = await client.query(
        'SELECT * FROM members WHERE id = $1 AND company_id = $2',
        [memberId, companyId]
      );
      
      if (memberResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Member not found' },
          { status: 404 }
        );
      }
      
      // Get memberships with plan details
      const membershipsResult = await client.query(
        `SELECT ms.*, mp.plan_name, mp.duration_months, mp.price as plan_price,
         u.name as created_by_name
         FROM memberships ms
         LEFT JOIN membership_plans mp ON ms.plan_id = mp.id
         LEFT JOIN users u ON ms.created_by = u.id
         WHERE ms.member_id = $1
         ORDER BY ms.start_date DESC`,
        [memberId]
      );
      
      // Get hold history for each membership
      const holdHistoryResult = await client.query(
        `SELECT mh.*, ms.member_id
         FROM membership_holds mh
         JOIN memberships ms ON mh.membership_id = ms.id
         WHERE ms.member_id = $1
         ORDER BY mh.created_at DESC`,
        [memberId]
      );
      
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
      
      // Get payments
      const paymentsResult = await client.query(
        `SELECT p.*
         FROM payments p
         JOIN memberships ms ON p.membership_id = ms.id
         WHERE ms.member_id = $1
         ORDER BY p.created_at DESC`,
        [memberId]
      );
      
      // Get payment transactions
      const transactionsResult = await client.query(
        `SELECT pt.*, p.reference_number
         FROM payment_transactions pt
         LEFT JOIN payments p ON pt.membership_id = p.membership_id
         WHERE pt.member_id = $1
         ORDER BY pt.transaction_date DESC`,
        [memberId]
      );
      
      // Get medical info
      const medicalResult = await client.query(
        `SELECT * FROM medical_info WHERE member_id = $1`,
        [memberId]
      );
      
      // Get payment summary
      const paymentSummaryResult = await client.query(
        `SELECT * FROM member_payment_summary WHERE member_id = $1`,
        [memberId]
      );
      
      return NextResponse.json({
        success: true,
        member: memberResult.rows[0],
        memberships: membershipsWithHistory,
        payments: paymentsResult.rows,
        transactions: transactionsResult.rows,
        medicalInfo: medicalResult.rows[0] || null,
        paymentSummary: paymentSummaryResult.rows[0] || null
      });
      
    } finally {
      client.release();
    }
    
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
        WHERE id = $10 AND company_id = $11
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

      await client.query('COMMIT');

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