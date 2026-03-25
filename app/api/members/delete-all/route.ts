import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function DELETE(request: NextRequest) {
  try {
    // Check delete_members permission
    const auth = await checkPermission(request, 'delete_members');
    if (!auth.authorized) {
      return auth.response;
    }
    
    const companyId = auth.session!.user.companyId;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // First delete all memberships for the company's members
      await client.query(`
        DELETE FROM memberships 
        WHERE member_id IN (
          SELECT id FROM members WHERE company_id = $1
        )
      `, [companyId]);
      
      // Then delete all members for the company
      const result = await client.query(`
        DELETE FROM members 
        WHERE company_id = $1
        RETURNING id
      `, [companyId]);
      
      await client.query('COMMIT');
      
      const deletedCount = result.rowCount;
      
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} members`,
        deletedCount
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error deleting all members:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete members', 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
