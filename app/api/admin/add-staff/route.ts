import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
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
    // Check if user is admin
    const session = await getSession();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { name, email } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
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

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
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

    // Create reception staff user (verified by default since admin creates them)
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role`,
      [name.trim(), normalizedEmail, hashedPassword, 'reception', true]
    );

    const newUser = result.rows[0];

    // Send email with login credentials
    try {
      await sendStaffCredentialsEmail(normalizedEmail, name.trim(), tempPassword);
    } catch (emailError) {
      console.error('Failed to send credentials email:', emailError);
      // Don't fail the creation if email fails
    }

    return NextResponse.json({
      message: 'Reception staff added successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
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
async function sendStaffCredentialsEmail(email: string, name: string, password: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to Eagle Gym - Your Login Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Welcome to Eagle Gym!</h2>
        <p>Hello ${name},</p>
        <p>You have been added as a reception staff member at Eagle Gym. Here are your login credentials:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Visit the gym management system login page</li>
          <li>Use the credentials above to log in</li>
          <li>Change your password after first login for security</li>
        </ol>
        
        <p>If you have any questions, please contact your administrator.</p>
        
        <p>Best regards,<br>Eagle Gym Management Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}