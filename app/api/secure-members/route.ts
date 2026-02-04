import { NextRequest, NextResponse } from 'next/server';
import { memberOps } from '@/lib/tenant';

// GET /api/secure-members - Get all members for the authenticated company
export async function GET(request: NextRequest) {
  try {
    // Extract tenant context from middleware headers
    const userId = parseInt(request.headers.get('x-user-id') || '0');
    const companyId = parseInt(request.headers.get('x-company-id') || '0');
    const role = request.headers.get('x-user-role') || '';

    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use tenant context for secure data access
    const context = { userId, companyId, role };
    const result = await memberOps.getAll(context);

    return NextResponse.json({ 
      members: result.rows,
      company: { id: companyId }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/secure-members - Create new member for the authenticated company
export async function POST(request: NextRequest) {
  try {
    const userId = parseInt(request.headers.get('x-user-id') || '0');
    const companyId = parseInt(request.headers.get('x-company-id') || '0');
    const role = request.headers.get('x-user-role') || '';

    if (!userId || !companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const context = { userId, companyId, role };
    
    const result = await memberOps.create(data, context);

    return NextResponse.json({ 
      member: result.rows[0],
      message: 'Member created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}