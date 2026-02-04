import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let action = 'unknown';
  
  try {
    // Validate company ID
    const companyId = parseInt(params.id);
    if (isNaN(companyId) || companyId <= 0) {
      return NextResponse.json(
        { error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const requestData = await request.json();
    action = requestData.action;
    const { rejectionReason, subdomain } = requestData;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    if (action === 'approve' && !subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required for approval' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      if (action === 'approve') {
        // Check if subdomain already exists
        const subdomainCheck = await client.query(
          'SELECT id FROM companies WHERE subdomain = $1 AND id != $2',
          [subdomain, companyId]
        );
        
        if (subdomainCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Subdomain already exists' },
            { status: 409 }
          );
        }

        // Update company status to approved and set subdomain
        const updateResult = await client.query(`
          UPDATE companies 
          SET status = 'approved', 
              subdomain = $1,
              approved_at = NOW()
          WHERE id = $2 AND status = 'pending'
          RETURNING id
        `, [subdomain, companyId]);
        
        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Company not found or not in pending status' },
            { status: 404 }
          );
        }

        // Verify the admin user
        await client.query(`
          UPDATE users 
          SET is_verified = true 
          WHERE company_id = $1 AND role_id IN (
            SELECT id FROM roles WHERE company_id = $1 AND name = 'Admin'
          )
        `, [companyId]);

      } else {
        // Update company status to rejected
        const updateResult = await client.query(`
          UPDATE companies 
          SET status = 'rejected',
              rejection_reason = $1
          WHERE id = $2 AND status = 'pending'
          RETURNING id
        `, [rejectionReason, companyId]);
        
        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Company not found or not in pending status' },
            { status: 404 }
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        message: `Company ${action}d successfully`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error(`Error processing company ${action}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}