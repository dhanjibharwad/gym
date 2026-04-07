'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } from '@/lib/rbac';

interface UserData {
  id: number;
  name: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  companyName?: string;
}

interface UserContextType {
  user: UserData | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

// Module-level cache — survives React re-mounts and page navigations within the same tab
let _cachedUser: UserData | null = null;
let _fetchPromise: Promise<void> | null = null;

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {}
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(_cachedUser);
  const [isLoading, setIsLoading] = useState(_cachedUser === null);

  const doFetch = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        const userData: UserData = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          permissions: data.user.permissions || [],
          isAdmin: data.user.isAdmin || isAdmin(data.user.role),
          companyName: data.user.companyName,
        };
        _cachedUser = userData;
        setUser(userData);
      } else {
        _cachedUser = null;
        setUser(null);
      }
    } catch {
      setUser(_cachedUser);
    } finally {
      _fetchPromise = null;
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    _cachedUser = null;
    _fetchPromise = null;
    setIsLoading(true);
    await doFetch();
  };

  useEffect(() => {
    if (_cachedUser !== null) {
      // Already have user in memory — no fetch needed
      setUser(_cachedUser);
      setIsLoading(false);
      return;
    }
    // Deduplicate: if a fetch is already in-flight, don't start another
    if (!_fetchPromise) {
      _fetchPromise = doFetch();
    } else {
      _fetchPromise.then(() => {
        setUser(_cachedUser);
        setIsLoading(false);
      });
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
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
