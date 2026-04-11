import nodemailer from 'nodemailer';
import pool from '@/lib/db';

// .env fallback transporter
function getEnvTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

async function trySmtp(config: any, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.username, pass: config.password },
      tls: { rejectUnauthorized: false },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `"${config.from_name || 'Gym Management'}" <${config.username}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Send email using company SMTP configs first.
 * Falls back to .env SMTP if no company configs exist or all fail.
 */
async function sendWithFallback(
  companyId: number | null,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  // Try company SMTP configs first
  if (companyId) {
    const result = await pool.query(
      `SELECT * FROM smtp_configs WHERE company_id = $1 ORDER BY is_active DESC, created_at ASC`,
      [companyId]
    );
    for (const config of result.rows) {
      const sent = await trySmtp(config, to, subject, html);
      if (sent) return;
    }
  }

  // Fallback to .env SMTP
  const transporter = getEnvTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(email: string, otp: string, companyId?: number) {
  await sendWithFallback(
    companyId ?? null,
    email,
    'Verify Your Email - Our Gym',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Email Verification - Our Gym</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #ea580c; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  );
}

export async function sendPasswordResetEmail(email: string, otp: string, companyId?: number) {
  await sendWithFallback(
    companyId ?? null,
    email,
    'Reset Your Password - Our Gym',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Password Reset - Our Gym</h2>
        <p>Your password reset code is:</p>
        <h1 style="color: #ea580c; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  );
}
