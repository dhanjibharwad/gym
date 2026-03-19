/**
 * Create / Upsert SuperAdmin
 *
 * Usage:
 *   node scripts/create-superadmin.js --email super@admin.com --password "Pass@1234" --name "Super Admin" --phone "9999999999"
 *
 * Optional DB env vars:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

async function main() {
  const email = getArg('email');
  const password = getArg('password');
  const name = getArg('name');
  const phone = getArg('phone');

  if (!email || !password || !name) {
    console.error('Missing required args. Required: --email --password --name');
    process.exit(1);
  }

  if (!process.env.PGPASSWORD || !String(process.env.PGPASSWORD).trim()) {
    console.error('Missing database password. Set environment variable PGPASSWORD and run again.');
    console.error('Example (PowerShell):');
    console.error('  $env:PGPASSWORD="your_db_password"');
    console.error('  node scripts/create-superadmin.js --email you@example.com --password "Pass@1234" --name "Super Admin"');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    database: process.env.PGDATABASE || 'Gymportal',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  });

  const client = await pool.connect();

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO public.super_admins (email, password, name, phone, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email)
       DO UPDATE SET
         password = EXCLUDED.password,
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         is_active = true
       RETURNING id, email, name, phone, is_active, created_at, last_login_at`,
      [normalizedEmail, hashedPassword, name.trim(), phone ? phone.trim() : null]
    );

    console.log('SuperAdmin upserted successfully:');
    console.table(result.rows);
  } catch (err) {
    console.error('Failed to create/upsert SuperAdmin:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
