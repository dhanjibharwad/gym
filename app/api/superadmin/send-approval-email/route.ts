import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { companyName, adminName, adminEmail } = await request.json();

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
      to: adminEmail,
      subject: '🎉 Company Approved - Welcome to Our Gym Portal!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Company Approved</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🎉 Congratulations!</h1>
                      <p style="margin: 10px 0 0 0; color: #fff3e0; font-size: 16px;">Your company has been approved</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                        Dear <strong>${adminName}</strong>,
                      </p>
                      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                        We are thrilled to inform you that <strong>${companyName}</strong> has been successfully approved.
                      </p>
                      <div style="background-color: #f9fafb; border-left: 4px solid #ea580c; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <p style="margin: 0; color: #1f2937; font-size: 15px;">
                          <strong>✅ What's Next?</strong><br><br>
                          • Access your dashboard<br>
                          • Set up membership plans<br>
                          • Add staff members<br>
                          • Start managing members
                        </p>
                      </div>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8004'}/auth/login" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
                          Login to Dashboard
                        </a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        <strong>Our Gym Portal</strong><br>
                        © 2026 Our Gym. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
