import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  try {
    const session = await getSession();
    const companyId = session?.user?.companyId;
    const userId = session?.user?.id;
    
    if (!companyId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: memberId, membershipId } = await params;

    console.log('Delete membership request:', { memberId, membershipId, companyId });

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify membership belongs to member and company
      const membershipCheck = await client.query(`
        SELECT m.id, m.member_id, mp.plan_name, mem.full_name
        FROM memberships m
        JOIN members mem ON m.member_id = mem.id
        JOIN membership_plans mp ON m.plan_id = mp.id
        WHERE m.id = $1 AND mem.company_id = $2
      `, [membershipId, companyId]);

      console.log('Membership check result:', membershipCheck.rows);

      if (membershipCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, message: 'Membership not found' },
          { status: 404 }
        );
      }

      const membership = membershipCheck.rows[0];

      // Delete related payment transactions
      await client.query(`
        DELETE FROM payment_transactions WHERE membership_id = $1
      `, [membershipId]);

      // Delete related payments
      await client.query(`
        DELETE FROM payments WHERE membership_id = $1
      `, [membershipId]);

      // Delete hold history
      await client.query(`
        DELETE FROM membership_holds WHERE membership_id = $1
      `, [membershipId]);

      // Delete the membership
      await client.query(`
        DELETE FROM memberships WHERE id = $1
      `, [membershipId]);

      await client.query('COMMIT');

      // Log audit action
      await createAuditLog({
        companyId,
        action: 'DELETE',
        entityType: 'membership',
        entityId: parseInt(membershipId),
        details: `Deleted membership: ${membership.plan_name} for ${membership.full_name}`,
        userRole: 'staff',
        userId
      });

      return NextResponse.json({
        success: true,
        message: 'Membership deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting membership:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete membership' },
      { status: 500 }
    );
  }
}
