'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAuth } from '@/lib/auth-utils';
import { Building2, Clock, CheckCircle, XCircle, TrendingUp, Users, Mail, Phone, Calendar, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

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
      const response = await verifyAuth();
      const authUser = response.user;
      if (!authUser || authUser.role !== 'SuperAdmin') {
        router.push('/auth/superadmin-login');
        return;
      }
      setUser(authUser);
      fetchPendingCompanies();
    } catch (error) {
      router.push('/auth/superadmin-login');
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
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: companies.length,
    pending: companies.filter(c => c.status === 'pending').length,
    approved: companies.filter(c => c.status === 'approved').length,
    rejected: companies.filter(c => c.status === 'rejected').length,
  };

  const recentCompanies = companies.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your platform.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <TrendingUp className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-xs font-medium opacity-90 mb-1">Total Companies</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Clock className="w-5 h-5" />
            </div>
            {stats.pending > 0 && (
              <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs font-semibold">!</span>
            )}
          </div>
          <p className="text-xs font-medium opacity-90 mb-1">Pending Approval</p>
          <p className="text-3xl font-bold">{stats.pending}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium opacity-90 mb-1">Approved</p>
          <p className="text-3xl font-bold">{stats.approved}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md p-4 text-white hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium opacity-90 mb-1">Rejected</p>
          <p className="text-3xl font-bold">{stats.rejected}</p>
        </div>
      </div>

      {/* Recent Companies Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Companies</h2>
              <p className="text-sm text-gray-600 mt-1">Latest registration requests</p>
            </div>
            <Link 
              href="/superadmin/companies"
              className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              View All
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentCompanies.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No companies registered yet</p>
              </div>
            ) : (
              recentCompanies.map((company) => (
                <div key={company.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-orange-100 p-2 rounded-lg mt-1">
                        <Building2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{company.name}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{company.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{company.admin_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                        company.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        company.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {company.status === 'pending' && <Clock className="w-3 h-3" />}
                        {company.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {company.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                      </span>
                      {company.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApproval(company.id, 'approve')}
                            className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleApproval(company.id, 'reject')}
                            className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
    </div>
  );
}
