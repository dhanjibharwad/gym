/**
 * Permission Seeder Script
 * Run this to populate the permissions table
 * 
 * Usage: node scripts/seed-permissions.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Gymportal',
  user: 'postgres',
  password: 'Qwerty123@711',
});

const permissions = [
  // Dashboard
  { name: 'view_dashboard', description: 'View main dashboard and statistics', module: 'dashboard', category: 'read' },
  
  // Members
  { name: 'view_members', description: 'View members list and details', module: 'members', category: 'read' },
  { name: 'add_members', description: 'Add new members to the system', module: 'members', category: 'write' },
  { name: 'edit_members', description: 'Edit existing member information', module: 'members', category: 'write' },
  { name: 'delete_members', description: 'Delete members from the system', module: 'members', category: 'admin' },
  
  // Payments
  { name: 'view_payments', description: 'View payment history and records', module: 'payments', category: 'read' },
  { name: 'manage_payments', description: 'Process new payments and refunds', module: 'payments', category: 'write' },
  { name: 'view_revenue', description: 'View revenue reports and financial data', module: 'payments', category: 'read' },
  
  // Staff
  { name: 'view_staff', description: 'View staff members list', module: 'staff', category: 'read' },
  { name: 'add_staff', description: 'Add new staff members', module: 'staff', category: 'write' },
  { name: 'edit_staff', description: 'Edit staff member information', module: 'staff', category: 'write' },
  { name: 'delete_staff', description: 'Delete staff members', module: 'staff', category: 'admin' },
  
  // Roles
  { name: 'view_roles', description: 'View roles and their permissions', module: 'roles', category: 'read' },
  { name: 'manage_roles', description: 'Create, edit, and assign role permissions', module: 'roles', category: 'admin' },
  
  // Reports
  { name: 'view_reports', description: 'View system reports', module: 'reports', category: 'read' },
  { name: 'export_reports', description: 'Export reports to file', module: 'reports', category: 'write' },
  
  // Settings
  { name: 'manage_settings', description: 'Manage system settings and configuration', module: 'settings', category: 'admin' },
  
  // Plans
  { name: 'view_plans', description: 'View membership plans', module: 'plans', category: 'read' },
  { name: 'manage_plans', description: 'Create and edit membership plans', module: 'plans', category: 'write' },
  
  // Audit
  { name: 'view_audit_logs', description: 'View system audit logs', module: 'audit', category: 'read' }
];

async function seedPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('Starting permission seed...');
    
    // Insert permissions one by one to handle conflicts
    for (const perm of permissions) {
      try {
        await client.query(
          `INSERT INTO permissions (name, description, module, category) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (name) DO UPDATE 
           SET description = $2, module = $3, category = $4`,
          [perm.name, perm.description, perm.module, perm.category]
        );
        console.log(`✓ ${perm.name}`);
      } catch (err) {
        console.error(`✗ ${perm.name}:`, err.message);
      }
    }
    
    console.log('\nPermission seed completed!');
    
    // Show count
    const result = await client.query('SELECT COUNT(*) as count FROM permissions');
    console.log(`Total permissions in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedPermissions();
}

module.exports = { seedPermissions, permissions };
