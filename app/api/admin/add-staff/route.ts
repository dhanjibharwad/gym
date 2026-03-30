import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { checkPermission } from '@/lib/api-permissions';
import { createAuditLog } from '@/lib/audit-logger';
import nodemailer from 'nodemailer';

// Generate a random password
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    // Check add_staff permission
    const auth = await checkPermission(request, 'add_staff');
    if (!auth.authorized) {
      return auth.response;
    }

    const { name, email, roleId } = await request.json();

    // Validate required fields
    if (!name || !email || !roleId) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in the same company
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND company_id = $2',
      [normalizedEmail, auth.session!.user.companyId]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate temporary password
    const tempPassword = generatePassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Validate role exists in company
    const roleResult = await pool.query(
      'SELECT id, name FROM roles WHERE company_id = $1 AND id = $2',
      [auth.session!.user.companyId, roleId]
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid role selected' },
        { status: 400 }
      );
    }

    const selectedRole = roleResult.rows[0];

    // Create staff user with selected role
    const result = await pool.query(
      `INSERT INTO users (company_id, role_id, name, email, password, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name`,
      [auth.session!.user.companyId, roleId, name.trim(), normalizedEmail, hashedPassword, true]
    );

    const newUser = result.rows[0];

    // Log staff creation in audit logs
    await createAuditLog({
      companyId: auth.session!.user.companyId,
      action: 'CREATE',
      entityType: 'staff',
      entityId: newUser.id,
      details: `Staff member "${name.trim()}" (${normalizedEmail}) added with role "${selectedRole.name}" by ${auth.session!.user.name}`,
      userRole: auth.session!.user.role,
      userId: auth.session!.user.id
    });

    // Send email with login credentials
    try {
      console.log(`[EMAIL] Attempting to send credentials to: ${normalizedEmail}`);
      console.log(`[EMAIL] Email config:`, {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-4) : 'NOT_SET',
        pass: process.env.EMAIL_APP_PASSWORD ? '***' + process.env.EMAIL_APP_PASSWORD.slice(-4) : 'NOT_SET'
      });
      
      await sendStaffCredentialsEmail(normalizedEmail, name.trim(), tempPassword, selectedRole.name);
      console.log(`[EMAIL] ✅ Credentials email sent successfully to: ${normalizedEmail}`);
    } catch (emailError) {
      console.error('[EMAIL] ❌ Failed to send credentials email:', emailError);
      console.error('[EMAIL] Error details:', {
        message: emailError instanceof Error ? emailError.message : emailError,
        stack: emailError instanceof Error ? emailError.stack : undefined
      });
      
      // Return warning but don't fail the creation
      return NextResponse.json({
        message: 'Staff member added successfully, but email sending failed',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: selectedRole.name,
        },
        warning: 'Login credentials email could not be sent. Please contact the staff member manually.',
        emailError: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      message: 'Staff member added successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: selectedRole.name,
      },
    });

  } catch (error) {
    console.error('Add staff error:', error);
    return NextResponse.json(
      { error: 'Failed to add staff member' },
      { status: 500 }
    );
  }
}

// Send credentials email to new staff
async function sendStaffCredentialsEmail(email: string, name: string, password: string, roleName: string) {
  try {
    console.log(`[EMAIL] Creating transporter with config:`, {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-4) : 'NOT_SET',
        pass: process.env.EMAIL_APP_PASSWORD ? '***' + process.env.EMAIL_APP_PASSWORD.slice(-4) : 'NOT_SET'
      }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    // Verify transporter is created successfully
    await transporter.verify();
    console.log('[EMAIL] ✅ Transporter verified successfully');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Our  Gym - Your Login Credentials',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Welcome to Our  Gym!</h2>
        <p>Hello ${name},</p>
        <p>You have been added as a ${roleName.toLowerCase()} staff member at Our  Gym. Here are your login credentials:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Visit gym management system login page</li>
          <li>Use the credentials above to log in</li>
          <li>Change your password after first login for security</li>
        </ol>
        
        <p>If you have any questions, please contact your administrator.</p>
        
        <p>Best regards,<br>Our  Gym Management Team</p>
      </div>
      `,
    };

    console.log(`[EMAIL] Sending email to: ${email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] ✅ Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('[EMAIL] ❌ Error sending email:', error);
    throw error;
  }
}