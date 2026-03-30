/**
 * Manual Prefetch Trigger Component
 * 
 * Add this button to your dashboard to manually trigger prefetching
 * Useful when automatic prefetching is disabled to reduce DB load
 */

'use client';

import { Zap } from 'lucide-react';
import { prefetchByRole } from '@/lib/prefetch-pages';
import { usePermission } from '@/components/rbac/PermissionGate';

export default function ManualPrefetchButton() {
  const { can } = usePermission();

  const handlePrefetch = () => {
    console.log('🚀 Manual prefetch triggered by user');
    // Just trigger prefetch without checking user
    prefetchByRole('admin'); // Will use actual role from session on server
    
    // Show visual feedback
    alert('🚀 Pre-fetching started! Navigation will be faster now.');
  };

  return (
    <button
      onClick={handlePrefetch}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
      title="Manually trigger background prefetching for faster navigation"
    >
      <Zap className="w-4 h-4" />
      Speed Up Navigation
    </button>
  );
}
