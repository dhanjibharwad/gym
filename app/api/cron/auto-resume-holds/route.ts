import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { revalidateTag } from 'next/cache';

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `SELECT id, hold_start_date, hold_end_date 
         FROM memberships 
         WHERE status = 'on_hold' 
         AND hold_end_date IS NOT NULL 
         AND hold_end_date <= CURRENT_DATE`
      );
      
      const membershipsToResume = result.rows;
      
      for (const membership of membershipsToResume) {
        const daysOnHold = await client.query(
          `SELECT $1::date - $2::date as days`,
          [membership.hold_end_date, membership.hold_start_date]
        );
        
        const holdDays = daysOnHold.rows[0]?.days || 0;
        
        await client.query(
          `UPDATE memberships 
           SET status = 'active',
               is_on_hold = FALSE,
               end_date = end_date + ($1 || ' days')::interval
           WHERE id = $2`,
          [holdDays, membership.id]
        );
        
        await client.query(
          `UPDATE membership_holds 
           SET days_on_hold = $1,
               resumed_at = CURRENT_TIMESTAMP
           WHERE membership_id = $2 AND hold_end_date IS NOT NULL AND resumed_at IS NULL`,
          [holdDays, membership.id]
        );
      }
      
      await client.query('COMMIT');
      
      if (membershipsToResume.length > 0) {
        revalidateTag('member');
      }
      
      return NextResponse.json({
        success: true,
        message: `Auto-resumed ${membershipsToResume.length} membership(s)`,
        count: membershipsToResume.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Auto-resume error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to auto-resume memberships' },
      { status: 500 }
    );
  }
}
