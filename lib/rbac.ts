/**
 * Role-Based Access Control (RBAC) Utilities
 * 
 * This module provides functions for checking permissions and roles
 * in both client-side and server-side contexts.
 */

import {
  ALL_PERMISSION_NAMES,
  ADMIN_ROLE_NAME,
  PROTECTED_ROLES,
  getPermissionByName,
  type Permission
} from './permissions';

/**
 * Check if a role is the admin role
 * Admin has implicit access to all permissions
 */
export function isAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  return role.toLowerCase() === ADMIN_ROLE_NAME.toLowerCase();
}

/**
 * Check if a role is protected (cannot be deleted)
 */
export function isProtectedRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return PROTECTED_ROLES.includes(role.toLowerCase());
}

/**
 * Check if user has a specific permission
 * Admin always has all permissions
 */
export function hasPermission(
  userPermissions: string[] | null | undefined,
  permission: string,
  role?: string | null
): boolean {
  // Admin has all permissions
  if (isAdmin(role)) return true;
  
  // Check if user has the specific permission
  if (!userPermissions || userPermissions.length === 0) return false;
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 * Admin always has all permissions
 */
export function hasAnyPermission(
  userPermissions: string[] | null | undefined,
  permissions: string[],
  role?: string | null
): boolean {
  // Admin has all permissions
  if (isAdmin(role)) return true;
  
  if (!userPermissions || userPermissions.length === 0) return false;
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has all of the specified permissions
 * Admin always has all permissions
 */
export function hasAllPermissions(
  userPermissions: string[] | null | undefined,
  permissions: string[],
  role?: string | null
): boolean {
  // Admin has all permissions
  if (isAdmin(role)) return true;
  
  if (!userPermissions || userPermissions.length === 0) return false;
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * Get effective permissions for a user
 * Admin gets all permissions, staff gets their assigned permissions
 */
export function getEffectivePermissions(
  role: string | null | undefined,
  userPermissions: string[] | null | undefined
): string[] {
  if (isAdmin(role)) {
    return [...ALL_PERMISSION_NAMES];
  }
  return userPermissions || [];
}

/**
 * Filter a list of items based on permission requirements
 */
export function filterByPermission<T>(
  items: T[],
  getRequiredPermissions: (item: T) => string[],
  userPermissions: string[] | null | undefined,
  role?: string | null
): T[] {
  if (isAdmin(role)) return items;
  if (!userPermissions) return [];
  
  return items.filter(item => {
    const required = getRequiredPermissions(item);
    return hasAnyPermission(userPermissions, required, role);
  });
}

/**
 * Get permission details for a list of permission names
 */
export function getPermissionDetails(permissionNames: string[]): Permission[] {
  return permissionNames
    .map(name => getPermissionByName(name))
    .filter((p): p is Permission => p !== undefined);
}

/**
 * Group permissions by their module
 */
export function groupPermissionsByModule(permissionNames: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  
  permissionNames.forEach(name => {
    const permission = getPermissionByName(name);
    if (permission) {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(name);
    }
  });
  
  return grouped;
}

/**
 * Format permission name for display
 * e.g., "view_members" -> "View Members"
 */
export function formatPermissionName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate that all permissions in a list are valid system permissions
 */
export function validatePermissions(permissions: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  permissions.forEach(permission => {
    if (ALL_PERMISSION_NAMES.includes(permission)) {
      valid.push(permission);
    } else {
      invalid.push(permission);
    }
  });
  
  return { valid, invalid };
}

// Type for user with permissions
export interface UserWithPermissions {
  id: number;
  name: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
}

// Type for RBAC context
export interface RBACContext {
  user: UserWithPermissions | null;
  isLoading: boolean;
}
