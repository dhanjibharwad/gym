// app/(super-admin)/layout.tsx
import SuperAdminSidebar from "@/components/superadmin/SuperAdminSidebar";
import SuperAdminHeader from "@/components/superadmin/SuperAdminHeader";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 flex flex-col">
        <SuperAdminHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}