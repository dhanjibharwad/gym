const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gymportal',
  user: process.env.DB_USER || 'username',
  password: process.env.DB_PASSWORD || 'password',
});

async function run() {
  try {
    console.log("Adding missing columns to medical_info table...");
    await pool.query(`
      ALTER TABLE medical_info 
      ADD COLUMN IF NOT EXISTS height NUMERIC,
      ADD COLUMN IF NOT EXISTS weight NUMERIC,
      ADD COLUMN IF NOT EXISTS bmi NUMERIC,
      ADD COLUMN IF NOT EXISTS bmi_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fitness_goal VARCHAR(100);
    `);
    console.log("Columns added successfully!");
  } catch (err) {
    console.error("Error adding columns:", err);
  } finally {
    pool.end();
  }
}

run();
