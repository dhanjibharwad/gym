'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from './PermissionGate';
import GymLoader from '@/components/GymLoader';

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
  const [checked, setChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Wait for user data to load
    if (role === null) {
      return;
    }

    let access = false;

    // Admin always has access
    if (isAdmin()) {
      access = true;
    } else if (permission) {
      // Check single permission
      access = can(permission);
    } else if (permissions && permissions.length > 0) {
      // Check any of multiple permissions
      access = canAny(permissions);
    } else {
      // No permission required
      access = true;
    }

    setHasAccess(access);
    setChecked(true);

    // Redirect if no access
    if (!access) {
      router.push('/unauthorized');
    }
  }, [permission, permissions, can, canAny, isAdmin, role, router]);

  // Show loading state while checking
  if (!checked) {
    return (
      <>
        {loadingComponent || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <GymLoader size="lg" />
          </div>
        )}
      </>
    );
  }

  // Don't render children if no access (redirect will happen)
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}

export default PageGuard;
