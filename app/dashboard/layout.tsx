'use client';

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { UserProvider } from "@/components/rbac/PermissionGate";
import GymLoader from "@/components/GymLoader";
import { useUser } from "@/lib/hooks/useUser";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <GymLoader size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <UserProvider>
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