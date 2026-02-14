'use client';

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { usePathname } from 'next/navigation';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isAuthRoute = pathname?.startsWith('/auth') || pathname?.startsWith('/setup');
  const isSuperAdminRoute = pathname?.startsWith('/superadmin');
  
  if (isDashboardRoute || isAuthRoute || isSuperAdminRoute) {
    return <div className="bg-gray-50">{children}</div>;
  }

  return (
    <div className="bg-gray-950 text-white">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
