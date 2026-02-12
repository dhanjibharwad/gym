/**
 * Assign all permissions to admin roles
 * Run this to ensure all admin roles have full permissions
 * 
 * Usage: node scripts/assign-admin-permissions.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Gymportal',
  user: 'postgres',
  password: 'Qwerty123@711',
});

async function assignAdminPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('Starting admin permission assignment...\n');
    
    // Get all admin roles
    const adminRolesResult = await client.query(
      "SELECT id, name, company_id FROM roles WHERE LOWER(name) = 'admin'"
    );
    
    if (adminRolesResult.rows.length === 0) {
      console.log('No admin roles found.');
      return;
    }
    
    console.log(`Found ${adminRolesResult.rows.length} admin role(s)`);
    
    // Get all permissions
    const permissionsResult = await client.query('SELECT id, name FROM permissions');
    const allPermissions = permissionsResult.rows;
    
    console.log(`Total permissions available: ${allPermissions.length}\n`);
    
    // For each admin role, assign all permissions
    for (const role of adminRolesResult.rows) {
      console.log(`Processing admin role: ${role.name} (ID: ${role.id}, Company: ${role.company_id})`);
      
      // Clear existing permissions first
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [role.id]);
      
      // Insert all permissions
      let assignedCount = 0;
      for (const perm of allPermissions) {
        try {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [role.id, perm.id]
          );
          assignedCount++;
        } catch (err) {
          console.error(`  ✗ Failed to assign ${perm.name}:`, err.message);
        }
      }
      
      console.log(`  ✓ Assigned ${assignedCount} permissions\n`);
    }
    
    console.log('Admin permission assignment completed!');
    
    // Show summary
    const summaryResult = await client.query(`
      SELECT r.name, r.company_id, COUNT(rp.permission_id) as perm_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE LOWER(r.name) = 'admin'
      GROUP BY r.id, r.name, r.company_id
    `);
    
    console.log('\nSummary:');
    summaryResult.rows.forEach(row => {
      console.log(`  ${row.name} (Company ${row.company_id}): ${row.perm_count} permissions`);
    });
    
  } catch (error) {
    console.error('Assignment failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  assignAdminPermissions();
}

module.exports = { assignAdminPermissions };
