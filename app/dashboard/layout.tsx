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
      }, 1000); // Start after 1s so dashboard loads first
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

  if (!user) return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="w-64 bg-white shadow-lg shrink-0" />
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-white shadow-sm" />
        <main className="p-6 flex-1">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </main>
      </div>
    </div>
  );

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