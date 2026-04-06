'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from './PermissionGate';

interface PageGuardProps {
  /** Single permission required to view this page */
  permission?: string;
  /** Multiple permissions - user needs at least one */
  permissions?: string[];
  /** Children to render if permission check passes */
  children: React.ReactNode;
  /** Optional loading component */
  loadingComponent?: React.ReactNode;
}

/**
 * PageGuard Component
 * 
 * Protects entire pages based on permissions.
 * Redirects to /unauthorized if user doesn't have required permission(s).
 * 
 * @example
 * // Single permission
 * <PageGuard permission="view_members">
 *   <MembersPage />
 * </PageGuard>
 * 
 * // Any of multiple permissions
 * <PageGuard permissions={['view_members', 'add_members']}>
 *   <MembersPage />
 * </PageGuard>
 */
export function PageGuard({
  permission,
  permissions,
  children,
  loadingComponent
}: PageGuardProps) {
  const router = useRouter();
  const { can, canAny, isAdmin, role } = usePermission();

  useEffect(() => {
    if (role === null) return;

    let access = isAdmin()
      ? true
      : permission
      ? can(permission)
      : permissions?.length
      ? canAny(permissions)
      : true;

    if (!access) router.push('/unauthorized');
  }, [role]);

  // Still loading user — render children immediately to avoid blank screen
  // The useEffect above will redirect if no access once role is known
  if (role === null) {
    return <>{children}</>;
  }

  // Role known but no access — redirect already triggered
  const hasAccess = isAdmin()
    ? true
    : permission
    ? can(permission)
    : permissions?.length
    ? canAny(permissions)
    : true;

  if (!hasAccess) return null;

  return <>{children}</>;
}

export default PageGuard;
