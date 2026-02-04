import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const session = await getSession();
    
    // Extract data from FormData
    const data = {
      fullName: formData.get('fullName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      email: formData.get('email') as string || null,
      gender: formData.get('gender') as string || null,
      dateOfBirth: formData.get('dateOfBirth') as string || null,
      address: formData.get('address') as string || null,
      emergencyContactName: formData.get('emergencyContactName') as string || null,
      emergencyContactPhone: formData.get('emergencyContactPhone') as string || null,
      selectedPlan: formData.get('selectedPlan') as string,
      planStartDate: formData.get('planStartDate') as string,
      trainerAssigned: formData.get('trainerAssigned') as string || null,
      batchTime: formData.get('batchTime') as string || null,
      membershipType: formData.get('membershipType') as string || null,
      lockerRequired: formData.get('lockerRequired') === 'true',
      medicalConditions: formData.get('medicalConditions') as string || null,
      injuriesLimitations: formData.get('injuriesLimitations') as string || null,
      additionalNotes: formData.get('additionalNotes') as string || null,
      totalPlanFee: parseFloat(formData.get('totalPlanFee') as string) || 0,
      amountPaidNow: parseFloat(formData.get('amountPaidNow') as string) || 0,
      paymentMode: formData.get('paymentMode') as string,
      nextDueDate: formData.get('nextDueDate') as string || null,
      profilePhoto: formData.get('profilePhoto') as File || null,
    };
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert member first
      const memberResult = await client.query(
        `INSERT INTO members (
          full_name, phone_number, email, gender, date_of_birth, 
          address, emergency_contact_name, emergency_contact_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          data.fullName,
          data.phoneNumber,
          data.email || null,
          data.gender || null,
          data.dateOfBirth || null,
          data.address || null,
          data.emergencyContactName || null,
          data.emergencyContactPhone || null
        ]
      );
      
      const memberId = memberResult.rows[0].id;
      
      // Handle profile photo upload after getting memberId
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
      
      // Get plan ID
      const planResult = await client.query(
        'SELECT id FROM membership_plans WHERE plan_name = $1',
        [data.selectedPlan]
      );
      
      if (planResult.rows.length === 0) {
        throw new Error('Invalid plan selected');
      }
      
      const planId = planResult.rows[0].id;
      
      // Calculate end date
      const planDetailsResult = await client.query(
        'SELECT duration_months FROM membership_plans WHERE id = $1',
        [planId]
      );
      
      const startDate = new Date(data.planStartDate);
      const endDate = new Date(startDate);
      const monthsToAdd = planDetailsResult.rows[0].duration_months;
      endDate.setMonth(endDate.getMonth() + monthsToAdd);
      
      // Insert membership
      const userName = session?.user?.name || 'user not logged in';
      const membershipResult = await client.query(
        `INSERT INTO memberships (
          member_id, plan_id, start_date, end_date, trainer_assigned,
          batch_time, membership_type, locker_required, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          memberId,
          planId,
          data.planStartDate,
          endDate.toISOString().split('T')[0],
          data.trainerAssigned || null,
          data.batchTime || null,
          data.membershipType || null,
          data.lockerRequired || false,
          userName
        ]
      );
      
      const membershipId = membershipResult.rows[0].id;
      
      // Insert payment
      const paymentStatus = data.amountPaidNow >= data.totalPlanFee ? 'full' : 
                           data.amountPaidNow > 0 ? 'partial' : 'pending';
      
      await client.query(
        `INSERT INTO payments (
          membership_id, total_amount, paid_amount, payment_mode,
          payment_status, next_due_date
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          membershipId,
          data.totalPlanFee,
          data.amountPaidNow,
          data.paymentMode,
          paymentStatus,
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
      }
      
      // Insert medical info
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
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Member registered successfully',
        memberId: memberId
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