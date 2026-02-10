import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const body = await request.json();
    const { action, hold_reason } = body;
    
    const session = await getSession();
    const userId = session?.user?.id;
    const companyId = session?.user?.companyId;
    
    if (!companyId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      const membershipCheck = await client.query(
        `SELECT ms.*, m.company_id 
         FROM memberships ms
         JOIN members m ON ms.member_id = m.id
         WHERE ms.id = $1 AND m.company_id = $2`,
        [membershipId, companyId]
      );
      
      if (membershipCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Membership not found' },
          { status: 404 }
        );
      }
      
      const membership = membershipCheck.rows[0];
      
      if (action === 'hold') {
        if (membership.status !== 'active') {
          return NextResponse.json(
            { success: false, message: 'Only active memberships can be put on hold' },
            { status: 400 }
          );
        }
        
        await client.query('BEGIN');
        
        await client.query(
          `UPDATE memberships 
           SET status = 'on_hold',
               is_on_hold = TRUE,
               hold_start_date = CURRENT_DATE,
               hold_reason = $1,
               original_end_date = CASE WHEN original_end_date IS NULL THEN end_date ELSE original_end_date END
           WHERE id = $2`,
          [hold_reason || 'No reason provided', membershipId]
        );
        
        await client.query(
          `INSERT INTO membership_holds (membership_id, hold_start_date, hold_reason, created_by)
           VALUES ($1, CURRENT_DATE, $2, $3)`,
          [membershipId, hold_reason || 'No reason provided', userId]
        );
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Membership put on hold successfully'
        });
        
      } else if (action === 'resume') {
        if (membership.status !== 'on_hold') {
          return NextResponse.json(
            { success: false, message: 'Only on-hold memberships can be resumed' },
            { status: 400 }
          );
        }
        
        await client.query('BEGIN');
        
        const daysOnHold = await client.query(
          `SELECT CURRENT_DATE - hold_start_date as days FROM memberships WHERE id = $1`,
          [membershipId]
        );
        
        const holdDays = daysOnHold.rows[0]?.days || 0;
        
        await client.query(
          `UPDATE memberships 
           SET status = 'active',
               is_on_hold = FALSE,
               hold_end_date = CURRENT_DATE,
               end_date = end_date + ($1 || ' days')::interval
           WHERE id = $2`,
          [holdDays, membershipId]
        );
        
        await client.query(
          `UPDATE membership_holds 
           SET hold_end_date = CURRENT_DATE,
               days_on_hold = $1,
               resumed_at = CURRENT_TIMESTAMP
           WHERE membership_id = $2 AND hold_end_date IS NULL`,
          [holdDays, membershipId]
        );
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: `Membership resumed. End date extended by ${holdDays} days.`,
          daysExtended: holdDays
        });
        
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Membership hold/resume error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
