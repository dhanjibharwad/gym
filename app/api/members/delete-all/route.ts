import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkPermission } from '@/lib/api-permissions';

export async function DELETE(request: NextRequest) {
  try {
    const auth = await checkPermission(request, 'delete_members');
    if (!auth.authorized) return auth.response;

    const companyId = auth.session!.user.companyId;

    // Ensure column exists
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`).catch(() => {});

    // Soft delete all non-deleted members for this company
    const result = await pool.query(
      `UPDATE members SET deleted_at = NOW()
       WHERE company_id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.rowCount} members`,
      deletedCount: result.rowCount
    });

  } catch (error) {
    console.error('Error deleting all members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete members', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
