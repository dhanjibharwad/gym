'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } from '@/lib/rbac';

// Context for user permissions
interface UserContextType {
  user: {
    id: number;
    name: string;
    role: string;
    permissions: string[];
    isAdmin: boolean;
  } | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {}
});

// Hook to use user context
export function useUser() {
  return useContext(UserContext);
}

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success) {
        setUser({
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          permissions: data.user.permissions || [],
          isAdmin: data.user.isAdmin || isAdmin(data.user.role)
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

// PermissionGate Props
interface PermissionGateProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions to check */
  permissions?: string[];
  /** Require all permissions (true) or any permission (false). Default: false */
  requireAll?: boolean;
  /** Content to render if permission check passes */
  children: ReactNode;
  /** Content to render if permission check fails. Default: null */
  fallback?: ReactNode;
}

/**
 * PermissionGate Component
 * 
 * Renders children only if the user has the required permission(s).
 * Admin users always have all permissions.
 * 
 * @example
 * // Check single permission
 * <PermissionGate permission="view_members">
 *   <MembersList />
 * </PermissionGate>
 * 
 * // Check any of multiple permissions
 * <PermissionGate permissions={['view_members', 'add_members']}>
 *   <MembersSection />
 * </PermissionGate>
 * 
 * // Require all permissions
 * <PermissionGate permissions={['edit_members', 'delete_members']} requireAll>
 *   <AdminControls />
 * </PermissionGate>
 * 
 * // With fallback
 * <PermissionGate permission="view_revenue" fallback={<UpgradePrompt />}>
 *   <RevenueChart />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null
}: PermissionGateProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  // Admin has all permissions
  if (user.isAdmin) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (permission) {
    // Check single permission
    hasAccess = hasPermission(user.permissions, permission, user.role);
  } else if (permissions && permissions.length > 0) {
    // Check multiple permissions
    if (requireAll) {
      hasAccess = hasAllPermissions(user.permissions, permissions, user.role);
    } else {
      hasAccess = hasAnyPermission(user.permissions, permissions, user.role);
    }
  } else {
    // No permission specified, allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// RoleGate Props
interface RoleGateProps {
  /** Allowed roles */
  allowedRoles: string[];
  /** Content to render if role check passes */
  children: ReactNode;
  /** Content to render if role check fails. Default: null */
  fallback?: ReactNode;
}

/**
 * RoleGate Component
 * 
 * Renders children only if the user has one of the allowed roles.
 * 
 * @example
 * <RoleGate allowedRoles={['admin', 'manager']}>
 *   <AdminPanel />
 * </RoleGate>
 */
export function RoleGate({
  allowedRoles,
  children,
  fallback = null
}: RoleGateProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  const hasAllowedRole = allowedRoles.some(
    role => role.toLowerCase() === user.role.toLowerCase()
  );

  return hasAllowedRole ? <>{children}</> : <>{fallback}</>;
}

// AdminGate Props
interface AdminGateProps {
  /** Content to render if user is admin */
  children: ReactNode;
  /** Content to render if user is not admin. Default: null */
  fallback?: ReactNode;
}

/**
 * AdminGate Component
 * 
 * Renders children only if the user is an admin.
 * 
 * @example
 * <AdminGate>
 *   <SystemSettings />
 * </AdminGate>
 */
export function AdminGate({
  children,
  fallback = null
}: AdminGateProps) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return null;
  }

  if (!user || !user.isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Can component - simplified permission check
interface CanProps {
  /** Permission(s) to check */
  I: string | string[];
  /** Require all permissions */
  all?: boolean;
  /** Content to render */
  children: ReactNode;
  /** Fallback content */
  otherwise?: ReactNode;
}

/**
 * Can Component - Simplified permission check
 * 
 * @example
 * <Can I="view_members">
 *   <MembersList />
 * </Can>
 * 
 * <Can I={['edit_members', 'delete_members']} all>
 *   <AdminControls />
 * </Can>
 */
export function Can({
  I,
  all = false,
  children,
  otherwise = null
}: CanProps) {
  const permissions = Array.isArray(I) ? I : [I];
  
  return (
    <PermissionGate 
      permissions={permissions} 
      requireAll={all}
      fallback={otherwise}
    >
      {children}
    </PermissionGate>
  );
}

// Hook for checking permissions programmatically
export function usePermission() {
  const { user } = useUser();

  return {
    /**
     * Check if user has a specific permission
     */
    can: (permission: string): boolean => {
      if (!user) return false;
      if (user.isAdmin) return true;
      return hasPermission(user.permissions, permission, user.role);
    },

    /**
     * Check if user has any of the permissions
     */
    canAny: (permissions: string[]): boolean => {
      if (!user) return false;
      if (user.isAdmin) return true;
      return hasAnyPermission(user.permissions, permissions, user.role);
    },

    /**
     * Check if user has all of the permissions
     */
    canAll: (permissions: string[]): boolean => {
      if (!user) return false;
      if (user.isAdmin) return true;
      return hasAllPermissions(user.permissions, permissions, user.role);
    },

    /**
     * Check if user is admin
     */
    isAdmin: (): boolean => {
      return user?.isAdmin || false;
    },

    /**
     * Get user permissions
     */
    permissions: user?.permissions || [],

    /**
     * Get user role
     */
    role: user?.role || null
  };
}

export default PermissionGate;
