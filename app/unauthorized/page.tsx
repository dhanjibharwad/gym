"use client";

import { useRouter } from 'next/navigation';
import { Shield, Home, LayoutDashboard } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Shield className="w-24 h-24 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
