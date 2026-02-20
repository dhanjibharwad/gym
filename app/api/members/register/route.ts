import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const session = await getSession();
    
    // Check if this is for an existing member
    const memberType = formData.get('memberType') as string;
    const existingMemberId = formData.get('existingMemberId') as string;
    
    // Extract data from FormData
    const data = {
      fullName: formData.get('fullName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      email: formData.get('email') as string || null,
      gender: formData.get('gender') as string || null,
      occupation: formData.get('occupation') as string || null,
      dateOfBirth: formData.get('dateOfBirth') as string || null,
      age: parseInt(formData.get('age') as string) || null,
      address: formData.get('address') as string || null,
      emergencyContactName: formData.get('emergencyContactName') as string || null,
      emergencyContactPhone: formData.get('emergencyContactPhone') as string || null,
      selectedPlan: formData.get('selectedPlan') as string,
      dateOfAdmission: formData.get('dateOfAdmission') as string || null,
      planStartDate: formData.get('planStartDate') as string,
      planEndDate: formData.get('planEndDate') as string,
      trainerAssigned: formData.get('trainerAssigned') as string || null,
      batchTime: formData.get('batchTime') as string || null,
      membershipTypes: formData.get('membershipTypes') as string || null,
      referenceOfAdmission: formData.get('referenceOfAdmission') as string || null,
      notes: formData.get('notes') as string || null,
      medicalConditions: formData.get('medicalConditions') as string || null,
      injuriesLimitations: formData.get('injuriesLimitations') as string || null,
      additionalNotes: formData.get('additionalNotes') as string || null,
      totalPlanFee: parseFloat(formData.get('totalPlanFee') as string) || 0,
      amountPaidNow: parseFloat(formData.get('amountPaidNow') as string) || 0,
      paymentMode: formData.get('paymentMode') as string,
      referenceNumber: formData.get('referenceNumber') as string || null,
      nextDueDate: formData.get('nextDueDate') as string || null,
      profilePhoto: formData.get('profilePhoto') as File || null,
    };
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let memberId: number;
      
      // Handle existing member or create new member
      if (memberType === 'existing' && existingMemberId) {
        memberId = parseInt(existingMemberId);
        
        // Verify member belongs to user's company
        const memberCheck = await client.query(
          'SELECT id FROM members WHERE id = $1 AND company_id = $2',
          [memberId, session?.user?.companyId]
        );
        
        if (memberCheck.rows.length === 0) {
          throw new Error('Member not found or unauthorized');
        }
      } else {
        // Get next member number for this company
        const memberNumberResult = await client.query(
          'SELECT COALESCE(MAX(member_number), 0) + 1 as next_number FROM members WHERE company_id = $1',
          [session?.user?.companyId]
        );
        const memberNumber = memberNumberResult.rows[0].next_number;
        
        // Insert new member
        const memberResult = await client.query(
          `INSERT INTO members (
            company_id, member_number, full_name, phone_number, email, gender, occupation,
            date_of_birth, age, address, emergency_contact_name, emergency_contact_phone
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, member_number`,
          [
            session?.user?.companyId,
            memberNumber,
            data.fullName,
            data.phoneNumber,
            data.email,
            data.gender,
            data.occupation,
            data.dateOfBirth,
            data.age,
            data.address,
            data.emergencyContactName,
            data.emergencyContactPhone
          ]
        );
        
        memberId = memberResult.rows[0].id;
        
        // Handle profile photo upload for new members
        if (data.profilePhoto && data.profilePhoto.size > 0) {
          const bytes = await data.profilePhoto.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          const fileName = `${memberId}_${data.profilePhoto.name}`;
          const filePath = path.join(process.cwd(), 'public/uploads/members', fileName);
          
          await writeFile(filePath, buffer);
          
          const profilePhotoUrl = `/uploads/members/${fileName}`;
          await client.query(
            'UPDATE members SET profile_photo_url = $1 WHERE id = $2',
            [profilePhotoUrl, memberId]
          );
        }
        
        // Insert medical info for new members
        await client.query(
          `INSERT INTO medical_info (
            member_id, medical_conditions, injuries_limitations, additional_notes
          ) VALUES ($1, $2, $3, $4)`,
          [
            memberId,
            data.medicalConditions || null,
            data.injuriesLimitations || null,
            data.additionalNotes || null
          ]
        );
      }
      
      // Get plan ID
      const planResult = await client.query(
        'SELECT id FROM membership_plans WHERE plan_name = $1',
        [data.selectedPlan]
      );
      
      if (planResult.rows.length === 0) {
        throw new Error('Invalid plan selected');
      }
      
      const planId = planResult.rows[0].id;
      
      // Use provided end date or calculate it
      let endDate: string;
      if (data.planEndDate) {
        endDate = data.planEndDate;
      } else {
        const planDetailsResult = await client.query(
          'SELECT duration_months FROM membership_plans WHERE id = $1',
          [planId]
        );
        
        const startDate = new Date(data.planStartDate);
        const calculatedEndDate = new Date(startDate);
        const monthsToAdd = planDetailsResult.rows[0].duration_months;
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + monthsToAdd);
        endDate = calculatedEndDate.toISOString().split('T')[0];
      }
      
      // Insert membership
      const membershipResult = await client.query(
        `INSERT INTO memberships (
          member_id, plan_id, date_of_admission, start_date, end_date, trainer_assigned,
          batch_time, membership_types, reference_of_admission, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          memberId,
          planId,
          data.dateOfAdmission,
          data.planStartDate,
          endDate,
          data.trainerAssigned,
          data.batchTime,
          data.membershipTypes ? data.membershipTypes.split(',') : null,
          data.referenceOfAdmission,
          data.notes,
          session?.user?.id
        ]
      );
      
      const membershipId = membershipResult.rows[0].id;
      
      // Insert payment
      const paymentStatus = data.amountPaidNow >= data.totalPlanFee ? 'full' : 
                           data.amountPaidNow > 0 ? 'partial' : 'pending';
      
      await client.query(
        `INSERT INTO payments (
          membership_id, total_amount, paid_amount, payment_mode,
          payment_status, reference_number, next_due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          membershipId,
          data.totalPlanFee,
          data.amountPaidNow,
          data.paymentMode,
          paymentStatus,
          data.referenceNumber,
          data.nextDueDate || null
        ]
      );
      
      // Insert initial payment transaction if amount was paid
      if (data.amountPaidNow > 0) {
        const userName = session?.user?.name || 'user not logged in';
        await client.query(
          `INSERT INTO payment_transactions (
            member_id, membership_id, transaction_type, amount, payment_mode, transaction_date, created_by
          ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [
            memberId,
            membershipId,
            'membership_fee',
            data.amountPaidNow,
            data.paymentMode,
            userName
          ]
        );
        
        // Create audit log for initial payment
        const userRole = session?.user?.role || 'staff';
        await client.query(
          `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'CREATE',
            'payment',
            membershipId,
            `Initial payment of ₹${data.amountPaidNow} for ${data.fullName} by ${userName}`,
            userRole,
            session?.user?.companyId
          ]
        );
      }
      
      // Create audit log for member creation
      if (memberType !== 'existing') {
        const userName = session?.user?.name || 'Unknown';
        const userRole = session?.user?.role || 'staff';
        await client.query(
          `INSERT INTO audit_logs (action, entity_type, entity_id, details, user_role, company_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'CREATE',
            'member',
            memberId,
            `Member ${data.fullName} created by ${userName}`,
            userRole,
            session?.user?.companyId
          ]
        );
      }
      
      await client.query('COMMIT');
      
      // Get member number for response
      const memberNumberQuery = await client.query(
        'SELECT LPAD(member_number::text, 4, \'0\') as formatted_id FROM members WHERE id = $1',
        [memberId]
      );
      const displayMemberId = memberNumberQuery.rows[0]?.formatted_id || String(memberId).padStart(4, '0');
      
      return NextResponse.json({
        success: true,
        message: memberType === 'existing' ? 'Membership renewed successfully' : 'Member registered successfully',
        memberId: displayMemberId
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('phone_number')) {
        return NextResponse.json(
          { success: false, message: 'Phone number already exists' },
          { status: 400 }
        );
      }
      if (error.message.includes('email')) {
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}