-- Seed permissions for the RBAC system
-- Run this after creating the database schema

-- Insert all system permissions
INSERT INTO permissions (name, description, module, category) VALUES
-- Dashboard
('view_dashboard', 'View main dashboard and statistics', 'dashboard', 'read'),

-- Members
('view_members', 'View members list and details', 'members', 'read'),
('add_members', 'Add new members to the system', 'members', 'write'),
('edit_members', 'Edit existing member information', 'members', 'write'),
('delete_members', 'Delete members from the system', 'members', 'admin'),

-- Payments
('view_payments', 'View payment history and records', 'payments', 'read'),
('manage_payments', 'Process new payments and refunds', 'payments', 'write'),
('view_revenue', 'View revenue reports and financial data', 'payments', 'read'),

-- Staff
('view_staff', 'View staff members list', 'staff', 'read'),
('add_staff', 'Add new staff members', 'staff', 'write'),
('edit_staff', 'Edit staff member information', 'staff', 'write'),
('delete_staff', 'Delete staff members', 'staff', 'admin'),

-- Roles
('view_roles', 'View roles and their permissions', 'roles', 'read'),
('manage_roles', 'Create, edit, and assign role permissions', 'roles', 'admin'),

-- Reports
('view_reports', 'View system reports', 'reports', 'read'),
('export_reports', 'Export reports to file', 'reports', 'write'),

-- Settings
('manage_settings', 'Manage system settings and configuration', 'settings', 'admin'),

-- Plans
('view_plans', 'View membership plans', 'plans', 'read'),
('manage_plans', 'Create and edit membership plans', 'plans', 'write'),

-- Audit
('view_audit_logs', 'View system audit logs', 'audit', 'read')
ON CONFLICT (name) DO NOTHING;

-- Note: Admin role gets all permissions implicitly
-- For each company, after creating the admin role, run:
-- INSERT INTO role_permissions (role_id, permission_id)
-- SELECT <admin_role_id>, id FROM permissions;
