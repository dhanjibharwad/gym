'use client';

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { UserProvider, useUser } from "@/components/rbac/PermissionGate";
import { useEffect } from 'react';
import { prefetchByRole } from '@/lib/prefetch-pages';

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && user) {
      const t = setTimeout(() => prefetchByRole(user.role), 2000);
      return () => clearTimeout(t);
    }
  }, [isLoading, user]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar userRole={user?.role} userPermissions={user?.permissions} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userRole={user?.role} userName={user?.name} companyName={user?.companyName} />
        <main className="p-3 sm:p-4 lg:p-6 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <DashboardInner>{children}</DashboardInner>
    </UserProvider>
  );
}