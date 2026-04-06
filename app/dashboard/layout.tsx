'use client';

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { UserProvider, useUser } from "@/components/rbac/PermissionGate";
import { useEffect, useState } from 'react';
import { prefetchByRole } from '@/lib/prefetch-pages';
import TopLoadingBar from '@/components/TopLoadingBar';

// Inner layout reads user from UserProvider context (single /api/auth/me call)
function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      const timeoutId = setTimeout(() => {
        prefetchByRole(user.role);
      }, 5000); // Start after 5s so login interactions are never blocked
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => prev >= 90 ? prev : prev + 10);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
    }
  }, [isLoading]);

  if (!user) return null;

  return (
    <>
      <TopLoadingBar isLoading={isLoading} progress={loadingProgress} />
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar userRole={user.role} userPermissions={user.permissions} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar userRole={user.role} userName={user.name} companyName={user.companyName} />
          <main className="p-3 sm:p-4 lg:p-6 flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <DashboardInner>{children}</DashboardInner>
    </UserProvider>
  );
}