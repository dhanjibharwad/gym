'use client';

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { UserProvider } from "@/components/rbac/PermissionGate";
import { useUser } from "@/lib/hooks/useUser";
import { useEffect, useState } from 'react';
import { prefetchByRole } from '@/lib/prefetch-pages';
import TopLoadingBar from '@/components/TopLoadingBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Prefetch common pages after user is loaded
  useEffect(() => {
    if (!loading && user) {
      // Start prefetching after a delay to not block initial render
      const timeoutId = setTimeout(() => {
        prefetchByRole(user.role);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading, user]);

  // Simulate loading progress
  useEffect(() => {
    if (loading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 100);
      
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
    }
  }, [loading]);

  if (!user) {
    return null;
  }

  return (
    <UserProvider>
      <TopLoadingBar isLoading={loading} progress={loadingProgress} />
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar userRole={user.role} userPermissions={user.permissions} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar userRole={user.role} userName={user.name} companyName={user.companyName} />
          <main className="p-3 sm:p-4 lg:p-6 flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  );
}