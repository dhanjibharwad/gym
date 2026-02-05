'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAuth } from '@/lib/auth-utils';

interface Company {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  admin_name: string;
  admin_phone: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authUser = await verifyAuth();
      if (!authUser || authUser.role !== 'SuperAdmin') {
        router.push('/auth/login');
        return;
      }
      setUser(authUser);
      fetchPendingCompanies();
    } catch (error) {
      router.push('/auth/login');
    }
  };

  const fetchPendingCompanies = async () => {
    try {
      const res = await fetch('/api/superadmin/companies');
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (companyId: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/superadmin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action }),
      });

      if (res.ok) {
        fetchPendingCompanies();
      }
    } catch (error) {
      console.error('Failed to update company:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Super Admin - Company Approvals</h1>
      
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-gray-500">{company.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{company.admin_name}</div>
                    <div className="text-sm text-gray-500">{company.admin_phone}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    company.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    company.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {company.status === 'pending' && (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleApproval(company.id, 'approve')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(company.id, 'reject')}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}