import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface MemberImportData {
  serialNumber: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  gender?: string;
  occuption?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  // Optional membership fields
  membershipPlan?: string;
  startDate?: string;
  trainerAssigned?: string;
  batchTime?: string;
  // Optional payment fields
  totalAmount?: number;
  amountPaid?: number;
  paymentMode?: string;
  referenceNumber?: string;
  nextDueDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('type') as string; // 'excel' or 'pdf'

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    let extractedMembers: MemberImportData[] = [];

    if (importType === 'excel') {
      try {
        extractedMembers = await extractFromExcel(file);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: (error as Error).message },
          { status: 400 }
        );
      }
    } else if (importType === 'pdf') {
      return NextResponse.json(
        { success: false, message: 'PDF import is currently not supported. Please use the Excel template instead.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please use Excel format.' },
        { status: 400 }
      );
    }

    if (extractedMembers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid member data found in file' },
        { status: 400 }
      );
    }

    // Validate and import members
    const client = await pool.connect();
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    try {
      await client.query('BEGIN');

      for (const member of extractedMembers) {
        try {
          // Validate required fields
          if (!member.serialNumber || !member.fullName) {
            skippedCount++;
            errors.push(`Skipped: Missing name or serial number`);
            continue;
          }

          // Validate phone number - must be at least 10 digits
          if (!member.phoneNumber || member.phoneNumber.replace(/[^0-9]/g, '').length < 10) {
            skippedCount++;
            errors.push(`Skipped ${member.fullName}: Invalid phone number (must be at least 10 digits)`);
            continue;
          }

          // Check if serial number already exists (exclude soft-deleted)
          const existingMember = await client.query(
            'SELECT id FROM members WHERE company_id = $1 AND member_number = $2 AND deleted_at IS NULL',
            [session.user.companyId, member.serialNumber]
          );

          if (existingMember.rows.length > 0) {
            skippedCount++;
            errors.push(`Skipped ${member.fullName}: Serial number ${member.serialNumber} already exists`);
            continue;
          }

          // Check if phone number already exists in this company (exclude soft-deleted)
          const existingPhone = await client.query(
            'SELECT id FROM members WHERE company_id = $1 AND phone_number = $2 AND deleted_at IS NULL',
            [session.user.companyId, member.phoneNumber]
          );

          if (existingPhone.rows.length > 0) {
            skippedCount++;
            errors.push(`Skipped ${member.fullName}: Phone number already exists`);
            continue;
          }

          // Insert new member
          const memberResult = await client.query(
            `INSERT INTO members (
              company_id, member_number, full_name, phone_number, email, 
              gender, occupation, date_of_birth, address, 
              emergency_contact_name, emergency_contact_phone
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [
              session.user.companyId,
              member.serialNumber,
              member.fullName,
              member.phoneNumber,
              member.email || null,
              member.gender || null,
              member.occuption || null,
              member.dateOfBirth || null,
              member.address || null,
              member.emergencyContactName || null,
              member.emergencyContactPhone || null,
            ]
          );

          const memberId = memberResult.rows[0].id;
          let membershipId: number | null = null;

          // Handle optional membership assignment
          if (member.membershipPlan) {
            try {
              // Get plan ID
              const planResult = await client.query(
                'SELECT id, duration_months FROM membership_plans WHERE plan_name = $1 AND company_id = $2',
                [member.membershipPlan, session.user.companyId]
              );

              if (planResult.rows.length > 0) {
                const planId = planResult.rows[0].id;
                
                // Use provided start date or default to today
                const membershipStartDate = member.startDate || new Date().toISOString().split('T')[0];
                
                // Calculate end date
                const startDate = new Date(membershipStartDate);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + planResult.rows[0].duration_months);
                const membershipEndDate = endDate.toISOString().split('T')[0];

                // Insert membership
                const membershipResult = await client.query(
                  `INSERT INTO memberships (
                    member_id, plan_id, start_date, end_date, trainer_assigned,
                    batch_time, created_by
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                  [
                    memberId,
                    planId,
                    membershipStartDate,
                    membershipEndDate,
                    member.trainerAssigned || null,
                    member.batchTime || null,
                    session.user.id
                  ]
                );

                membershipId = membershipResult.rows[0].id;

                // Handle optional payment processing
                if (member.totalAmount !== undefined && member.paymentMode) {
                  const totalAmount = member.totalAmount;
                  const amountPaid = member.amountPaid || 0;
                  const paymentStatus = amountPaid >= totalAmount ? 'full' :
                    amountPaid > 0 ? 'partial' : 'pending';

                  await client.query(
                    `INSERT INTO payments (
                      membership_id, total_amount, paid_amount, payment_mode,
                      payment_status, reference_number, next_due_date
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                      membershipId,
                      totalAmount,
                      amountPaid,
                      member.paymentMode,
                      paymentStatus,
                      member.referenceNumber || null,
                      member.nextDueDate || null
                    ]
                  );

                  // Create payment transaction if amount was paid
                  if (amountPaid > 0) {
                    await client.query(
                      `INSERT INTO payment_transactions (
                        member_id, membership_id, transaction_type, amount, payment_mode, transaction_date, created_by
                      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
                      [
                        memberId,
                        membershipId,
                        'membership_fee',
                        amountPaid,
                        member.paymentMode,
                        session.user.name || 'Unknown'
                      ]
                    );
                  }
                }
              }
            } catch (membershipError) {
              console.error('Error assigning membership during import:', membershipError);
              // Continue with member creation even if membership fails
            }
          }

          importedCount++;
        } catch (error) {
          console.error('Error importing member:', error);
          skippedCount++;
          errors.push(`Error importing ${member.fullName}: ${(error as Error).message}`);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} members imported, ${skippedCount} skipped`,
      importedCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in member import:', error);
    return NextResponse.json(
      { success: false, message: 'Error processing file: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function extractFromExcel(file: File): Promise<MemberImportData[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  console.log('Available sheets:', workbook.SheetNames);
  
  // Look for 'Members Template' sheet or use first sheet
  let worksheetName = workbook.SheetNames[0];
  if (workbook.SheetNames.includes('Members Template')) {
    worksheetName = 'Members Template';
  }
  
  console.log('Using sheet:', worksheetName);
  
  const worksheet = workbook.Sheets[worksheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Total rows parsed:', data.length);
  console.log('First few rows:', data.slice(0, 3));
  
  if (data.length === 0) {
    throw new Error(
      `No data found in sheet "${worksheetName}". ` +
      `Please ensure:\n1. Sheet has headers in Row 1\n2. Data starts from Row 2\n3. File is not empty`
    );
  }

  // Debug: Log first row and keys
  const firstRow = data[0] as any;
  const allKeys = Object.keys(firstRow);
  // console.log('Header keys from Excel:', allKeys);
  
  // Check if this is the Instructions sheet (has descriptions in headers)
  const isInstructionsFormat = allKeys.some(key => 
    key.includes(':') && (key.includes('Unique identifier') || key.includes('complete name'))
  );
  
  if (isInstructionsFormat) {
    console.log('Detected Instructions format with descriptions in headers');
  }

  // Helper function to find the matching column - handles both clean headers and headers with descriptions
  const findColumn = (row: any, ...searchTerms: string[]): [string, any] | null => {
    for (const term of searchTerms) {
      // First try exact match
      if (row.hasOwnProperty(term)) {
        return [term, row[term]];
      }
      
      // Then try to find key that STARTS WITH the search term
      const startMatch = Object.entries(row).find(([key]) => 
        key.split(':')[0].trim().toLowerCase() === term.toLowerCase()
      );
      if (startMatch && startMatch[1]) {
        return [startMatch[0], startMatch[1]];
      }
      
      // Then try partial match
      const partialMatch = Object.entries(row).find(([key]) =>
        key.toLowerCase().includes(term.toLowerCase())
      );
      if (partialMatch && partialMatch[1]) {
        return [partialMatch[0], partialMatch[1]];
      }
    }
    return null;
  };

  const findColumnValue = (row: any, ...searchTerms: string[]): string => {
    const result = findColumn(row, ...searchTerms);
    if (result && result[1]) {
      const val = String(result[1]).trim();
      return val && val !== 'undefined' && val !== '' ? val : '';
    }
    return '';
  };

  // Filter rows that have Serial Number data AND are not example rows
  const filtered = data.filter((row: any) => {
    const serialNo = findColumnValue(row, 'Serial No', 'Sr. No', 'Member No', 'Serial Number');
    const fullName = findColumnValue(row, 'Full Name', 'Name', 'Member Name');
    
    // Skip completely empty rows
    if (!serialNo || serialNo.length === 0) {
      return false;
    }
    
    // Skip example rows (MS001, John Doe, etc.)
    if (serialNo.toLowerCase() === 'ms001' && fullName.toLowerCase() === 'john doe') {
      // console.log('Skipped example row: MS001 / John Doe');
      return false;
    }
    
    return true;
  });

  console.log('Filtered rows with serial number:', filtered.length);

  if (filtered.length === 0) {
    const sampleKeys = allKeys.slice(0, 5);
    const sampleValues = Object.entries(firstRow)
      .slice(0, 5)
      .map(([k, v]) => `[${k}] = ${v}`)
      .join(' | ');
    
    throw new Error(
      `No valid member data found. Could not find rows with Serial No data.\n\n` +
      `Header keys detected: ${sampleKeys.join(', ')}\n` +
      `Sample values: ${sampleValues}\n\n` +
      `Troubleshooting:\n` +
      `✓ Using the correct sheet? (should be "Members Template" not "Instructions")\n` +
      `✓ Row 1 has clean headers without descriptions\n` +
      `✓ Your actual data starts from Row 2 (not mixed with instructions)\n` +
      `✓ Serial No. column in Row 2+ is not empty`
    );
  }

  // Helper function to convert Excel serial date to proper date string
  const convertExcelDate = (value: any): string => {
    if (!value) return '';
    
    const strValue = String(value).trim();
    
    // If it's already a date format (contains dashes or slashes), return as-is
    if (strValue.includes('-') || strValue.includes('/')) {
      return strValue;
    }
    
    // If it's a number (Excel serial date), convert it
    const numValue = Number(strValue);
    if (!isNaN(numValue) && numValue > 0) {
      // Excel dates start from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      // So we need to adjust for this
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const date = new Date(excelEpoch.getTime() + (numValue - 1) * 24 * 60 * 60 * 1000);
      
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    return strValue;
  };

  return filtered
    .map((row: any) => ({
      serialNumber: findColumnValue(row, 'Serial No', 'Sr. No', 'Member No', 'Serial Number'),
      fullName: findColumnValue(row, 'Full Name', 'Name', 'Member Name'),
      phoneNumber: findColumnValue(row, 'Phone Number', 'Phone', 'Contact', 'Mobile').replace(/[^0-9]/g, ''),
      email: findColumnValue(row, 'Email', 'Email Address') || undefined,
      gender: findColumnValue(row, 'Gender') || undefined,
      occuption: findColumnValue(row, 'Occupation', 'Profession') || undefined,
      dateOfBirth: convertExcelDate(findColumnValue(row, 'Date of Birth', 'DOB')) || undefined,
      address: findColumnValue(row, 'Address') || undefined,
      emergencyContactName: findColumnValue(row, 'Emergency Contact Name', 'Emergency Contact') || undefined,
      emergencyContactPhone: findColumnValue(row, 'Emergency Contact Phone', 'Emergency Phone').replace(/[^0-9]/g, '') || undefined,
      // Optional membership fields
      membershipPlan: findColumnValue(row, 'Membership Plan', 'Plan', 'Membership') || undefined,
      startDate: convertExcelDate(findColumnValue(row, 'Start Date', 'Plan Start Date', 'Membership Start')) || undefined,
      trainerAssigned: findColumnValue(row, 'Trainer Assigned', 'Trainer') || undefined,
      batchTime: findColumnValue(row, 'Batch Time', 'Batch', 'Timing') || undefined,
      // Optional payment fields
      totalAmount: parseFloat(findColumnValue(row, 'Total Amount', 'Amount', 'Fee', 'Price')) || undefined,
      amountPaid: parseFloat(findColumnValue(row, 'Amount Paid', 'Paid Amount', 'Payment')) || undefined,
      paymentMode: findColumnValue(row, 'Payment Mode', 'Payment Method', 'Payment Type') || undefined,
      referenceNumber: findColumnValue(row, 'Reference Number', 'Ref No', 'Transaction ID') || undefined,
      nextDueDate: convertExcelDate(findColumnValue(row, 'Next Due Date', 'Due Date')) || undefined,
    }));
}
