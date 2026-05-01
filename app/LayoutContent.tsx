'use client';

import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import BMICalculatorPanel from "@/app/components/BMICalculatorPanel";
import PrivacyPolicyPanel from "@/app/components/PrivacyPolicyPanel";
import TermsOfServicePanel from "@/app/components/TermsOfServicePanel";
import FAQPanel from "@/app/components/FAQPanel";
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isBMIOpen, setIsBMIOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);

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
      <Footer 
        onOpenBMI={() => setIsBMIOpen(true)} 
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenFAQ={() => setIsFAQOpen(true)}
      />
      <BMICalculatorPanel 
        isOpen={isBMIOpen} 
        onClose={() => setIsBMIOpen(false)} 
      />
      <PrivacyPolicyPanel
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
      <TermsOfServicePanel
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />
      <FAQPanel
        isOpen={isFAQOpen}
        onClose={() => setIsFAQOpen(false)}
      />
    </div>
  );
}
