import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (parseInt(staffId) === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete staff member
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id, name',
      [staffId, 'reception']
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Staff member not found or cannot be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: `Staff member "${result.rows[0].name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}