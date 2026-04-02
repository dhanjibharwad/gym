import nodemailer from 'nodemailer';
import pool from '@/lib/db';

async function getSmtpConfigs(companyId: number) {
  const result = await pool.query(
    `SELECT * FROM smtp_configs WHERE company_id = $1 ORDER BY is_active DESC, created_at ASC`,
    [companyId]
  );
  return result.rows;
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

export async function sendStaffEmail(
  companyId: number,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  const configs = await getSmtpConfigs(companyId);

  if (configs.length === 0) {
    return { sent: false, error: 'No SMTP configured. Please add SMTP in Settings.' };
  }

  // Try active config first, then fallover to others
  for (const config of configs) {
    const sent = await trySmtp(config, to, subject, html);

    if (sent) {
      // If this wasn't the active one, activate it and deactivate others
      if (!config.is_active) {
        await pool.query('UPDATE smtp_configs SET is_active = FALSE WHERE company_id = $1', [companyId]);
        await pool.query('UPDATE smtp_configs SET is_active = TRUE WHERE id = $1', [config.id]);
        console.log(`[SMTP] Failover: activated config id=${config.id} (${config.host})`);
      }
      return { sent: true };
    } else {
      // Deactivate this failed config
      if (config.is_active) {
        await pool.query('UPDATE smtp_configs SET is_active = FALSE WHERE id = $1', [config.id]);
        console.log(`[SMTP] Deactivated failed config id=${config.id} (${config.host})`);
      }
    }
  }

  return { sent: false, error: 'All SMTP configurations failed. Please check your settings.' };
}
