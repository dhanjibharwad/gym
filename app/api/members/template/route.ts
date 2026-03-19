import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Define headers
    const headers = [
      'Serial No.',
      'Full Name',
      'Phone Number',
      'Email',
      'Gender',
      'Occupation',
      'Date of Birth',
      'Address',
      'Emergency Contact Name',
      'Emergency Contact Phone'
    ];

    // Create ONE example row (Row 2) - Users will replace or delete this
    const exampleRow = [
      'MS001',
      'John Doe',
      '9876543210',
      'john@example.com',
      'Male',
      'Software Developer',
      '1990-01-15',
      '123 Main Street, City',
      'Jane Doe',
      '9876543211'
    ];

    // Create empty rows (9 more empty rows after example, total 10 data rows)
    const emptyRows = Array(9).fill(null).map(() => [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    // Build template data: headers + example row + empty rows
    const templateData = [headers, exampleRow, ...emptyRows];

    // Create instruction sheet with clear separation
    const instructionsData = [
      ['⚠️  INSTRUCTIONS SHEET - READ FIRST, THEN GO TO "MEMBERS TEMPLATE" TAB'],
      [''],
      ['THIS SHEET: Just for reading. Your actual data goes in the "Members Template" sheet!'],
      [''],
      ['Field Definitions:'],
      [''],
      ['1. Serial No.', 'Unique identifier (can be alphanumeric, e.g., MEM001, A123)', 'REQUIRED'],
      ['2. Full Name', 'Member\'s complete name', 'REQUIRED'],
      ['3. Phone Number', '10-digit mobile number', 'REQUIRED'],
      ['4. Email', 'Valid email address', 'OPTIONAL'],
      ['5. Gender', 'Male, Female, or Other', 'OPTIONAL'],
      ['6. Occupation', 'Member\'s profession', 'OPTIONAL'],
      ['7. Date of Birth', 'Format YYYY-MM-DD (e.g., 2000-01-15)', 'OPTIONAL'],
      ['8. Address', 'Complete residential address', 'OPTIONAL'],
      ['9. Emergency Contact Name', 'Name of emergency contact', 'OPTIONAL'],
      ['10. Emergency Contact Phone', '10-digit mobile number', 'OPTIONAL'],
      [''],
      ['IMPORTANT RULES:'],
      ['✓ Click on "Members Template" tab (NOT this one)'],
      ['✓ Row 1 = Headers (DO NOT CHANGE)'],
      ['✓ Row 2 = Example (REPLACE with your first member OR DELETE)'],
      ['✓ Rows 3+ = Enter your actual member data'],
      ['✓ Serial No., Full Name, Phone Number are REQUIRED'],
      ['✓ Phone = 10 digits only, no spaces (e.g., 9876543210)'],
      ['✓ Duplicate serial numbers will be SKIPPED'],
      ['✓ Dates = YYYY-MM-DD format (e.g., 2000-01-15)'],
      [''],
      ['HOW TO USE:'],
      ['1. Click "Members Template" tab at the bottom'],
      ['2. Row 1 has headers - DO NOT TOUCH'],
      ['3. Row 2 shows an EXAMPLE - delete it and replace with YOUR first member'],
      ['4. Enter more members in Row 3, 4, 5, etc.'],
      ['5. Save the file'],
      ['6. Upload to the app'],
      ['7. Done! Your members are imported'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    const templateSheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    const columnWidths = [15, 20, 15, 25, 12, 20, 15, 25, 20, 18];
    templateSheet['!cols'] = columnWidths.map(w => ({ wch: w }));
    instructionsSheet['!cols'] = [{ wch: 50 }, { wch: 40 }, { wch: 15 }];

    // Add sheets to workbook - MEMBERS TEMPLATE FIRST so it opens by default
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Members Template');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="Member_Import_Template.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, message: 'Error generating template: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
