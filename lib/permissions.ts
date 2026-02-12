/**
 * Enterprise Permission System Configuration
 * 
 * This file defines all permissions organized by functional modules.
 * Admin role has implicit access to ALL permissions.
 * Staff roles get permissions assigned from this pool.
 */

export type PermissionCategory = 'read' | 'write' | 'admin' | 'system';

export interface Permission {
  name: string;
  description: string;
  module: string;
  category: PermissionCategory;
}

export interface Module {
  name: string;
  description: string;
  permissions: Permission[];
}

// All permissions organized by modules
export const MODULES: Record<string, Module> = {
  dashboard: {
    name: 'Dashboard',
    description: 'Main dashboard access and overview',
    permissions: [
      {
        name: 'view_dashboard',
        description: 'View main dashboard and statistics',
        module: 'dashboard',
        category: 'read'
      }
    ]
  },
  members: {
    name: 'Members',
    description: 'Gym member management',
    permissions: [
      {
        name: 'view_members',
        description: 'View members list and details',
        module: 'members',
        category: 'read'
      },
      {
        name: 'add_members',
        description: 'Add new members to the system',
        module: 'members',
        category: 'write'
      },
      {
        name: 'edit_members',
        description: 'Edit existing member information',
        module: 'members',
        category: 'write'
      },
      {
        name: 'delete_members',
        description: 'Delete members from the system',
        module: 'members',
        category: 'admin'
      }
    ]
  },
  payments: {
    name: 'Payments',
    description: 'Payment processing and management',
    permissions: [
      {
        name: 'view_payments',
        description: 'View payment history and records',
        module: 'payments',
        category: 'read'
      },
      {
        name: 'manage_payments',
        description: 'Process new payments and refunds',
        module: 'payments',
        category: 'write'
      },
      {
        name: 'view_revenue',
        description: 'View revenue reports and financial data',
        module: 'payments',
        category: 'read'
      }
    ]
  },
  staff: {
    name: 'Staff Management',
    description: 'Staff user management',
    permissions: [
      {
        name: 'view_staff',
        description: 'View staff members list',
        module: 'staff',
        category: 'read'
      },
      {
        name: 'add_staff',
        description: 'Add new staff members',
        module: 'staff',
        category: 'write'
      },
      {
        name: 'edit_staff',
        description: 'Edit staff member information',
        module: 'staff',
        category: 'write'
      },
      {
        name: 'delete_staff',
        description: 'Delete staff members',
        module: 'staff',
        category: 'admin'
      }
    ]
  },
  roles: {
    name: 'Roles & Permissions',
    description: 'Role and permission management',
    permissions: [
      {
        name: 'view_roles',
        description: 'View roles and their permissions',
        module: 'roles',
        category: 'read'
      },
      {
        name: 'manage_roles',
        description: 'Create, edit, and assign role permissions',
        module: 'roles',
        category: 'admin'
      }
    ]
  },
  reports: {
    name: 'Reports',
    description: 'System reports and analytics',
    permissions: [
      {
        name: 'view_reports',
        description: 'View system reports',
        module: 'reports',
        category: 'read'
      },
      {
        name: 'export_reports',
        description: 'Export reports to file',
        module: 'reports',
        category: 'write'
      }
    ]
  },
  settings: {
    name: 'Settings',
    description: 'System configuration',
    permissions: [
      {
        name: 'manage_settings',
        description: 'Manage system settings and configuration',
        module: 'settings',
        category: 'admin'
      }
    ]
  },
  plans: {
    name: 'Membership Plans',
    description: 'Membership plan management',
    permissions: [
      {
        name: 'view_plans',
        description: 'View membership plans',
        module: 'plans',
        category: 'read'
      },
      {
        name: 'manage_plans',
        description: 'Create and edit membership plans',
        module: 'plans',
        category: 'write'
      }
    ]
  },
  audit: {
    name: 'Audit Logs',
    description: 'System audit and activity logs',
    permissions: [
      {
        name: 'view_audit_logs',
        description: 'View system audit logs',
        module: 'audit',
        category: 'read'
      }
    ]
  }
};

// Flatten all permissions into a single array
export const ALL_PERMISSIONS: Permission[] = Object.values(MODULES).flatMap(
  module => module.permissions
);

// Get all permission names as an array
export const ALL_PERMISSION_NAMES: string[] = ALL_PERMISSIONS.map(p => p.name);

// Get permissions for a specific module
export function getModulePermissions(moduleName: string): Permission[] {
  return MODULES[moduleName]?.permissions || [];
}

// Get permission details by name
export function getPermissionByName(name: string): Permission | undefined {
  return ALL_PERMISSIONS.find(p => p.name === name);
}

// Check if a permission exists
export function isValidPermission(name: string): boolean {
  return ALL_PERMISSION_NAMES.includes(name);
}

// Get modules as array for iteration
export function getModulesArray(): { key: string; module: Module }[] {
  return Object.entries(MODULES).map(([key, module]) => ({ key, module }));
}

// Admin role has all permissions implicitly
export const ADMIN_ROLE_NAME = 'admin';
export const ADMIN_PERMISSIONS = ALL_PERMISSION_NAMES;

// Protected system roles that cannot be deleted
export const PROTECTED_ROLES = [ADMIN_ROLE_NAME];

// Default permissions for new roles (minimal access)
export const DEFAULT_ROLE_PERMISSIONS = ['view_dashboard'];
