'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAuth } from '@/lib/auth-utils';
import { Building2, Mail, User, Phone, Calendar, CheckCircle, XCircle, Clock, Search, Filter, KeyRound, Eye, EyeOff, Copy, Check } from 'lucide-react';
import GymLoader from '@/components/GymLoader';

interface Company {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  admin_name: string;
  admin_phone: string;
  plan_name?: string;
  plan_price?: number;
  billing_period?: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Reset password modal state
  const [resetModal, setResetModal] = useState<{ companyId: number; companyName: string; adminName: string; adminEmail: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
      const company = companies.find(c => c.id === companyId);
      
      const res = await fetch('/api/superadmin/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, action }),
      });

      if (res.ok && action === 'approve' && company) {
        // Send approval email
        await fetch('/api/superadmin/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: company.name,
            adminName: company.admin_name,
            adminEmail: company.email,
          }),
        });
      }
      
      fetchPendingCompanies();
    } catch (error) {
      console.error('Failed to update company:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword.trim() || newPassword.trim().length < 6) return;
    setResetLoading(true);
    try {
      const res = await fetch('/api/superadmin/reset-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: resetModal.companyId, newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetResult({ success: true, message: data.message });
      } else {
        setResetResult({ success: false, message: data.error || 'Failed to reset password' });
      }
    } catch {
      setResetResult({ success: false, message: 'An error occurred' });
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setResetModal(null);
    setNewPassword('');
    setShowPassword(false);
    setResetResult(null);
    setCopied(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.admin_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || company.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: companies.length,
    pending: companies.filter(c => c.status === 'pending').length,
    approved: companies.filter(c => c.status === 'approved').length,
    rejected: companies.filter(c => c.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <GymLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Management</h1>
        <p className="text-gray-600">Review and manage company registration requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by company name, email, or admin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-transparent text-gray-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-transparent bg-white text-gray-800"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No companies found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <Building2 className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{company.name}</div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <Mail className="w-3 h-3" />
                            {company.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-1 font-medium text-gray-900">
                          <User className="w-4 h-4 text-gray-400" />
                          {company.admin_name}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Phone className="w-3 h-3" />
                          {company.admin_phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {company.plan_name ? (
                        <div>
                          <div className="font-medium text-gray-900">{company.plan_name}</div>
                          <div className="text-sm text-gray-500">
                            ₹{company.plan_price}/{company.billing_period === 'yearly' ? 'year' : 'month'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(company.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
                        company.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        company.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {company.status === 'pending' && <Clock className="w-3 h-3" />}
                        {company.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {company.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {company.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproval(company.id, 'approve')}
                              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproval(company.id, 'reject')}
                              className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        ) : null}
                        <button
                          onClick={() => setResetModal({ companyId: company.id, companyName: company.name, adminName: company.admin_name, adminEmail: company.email })}
                          className="flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm w-fit"
                        >
                          <KeyRound className="w-4 h-4" />
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Reset Admin Password</h3>
                <p className="text-sm text-gray-500">{resetModal.companyName}</p>
              </div>
              <button onClick={closeResetModal} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              {!resetResult ? (
                <>
                  {/* Admin info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{resetModal.adminName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {resetModal.adminEmail}
                    </div>
                  </div>

                  {/* New password input */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 font-mono"
                        autoFocus
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={copyPassword}
                          disabled={!newPassword}
                          className="p-1.5 text-gray-400 hover:text-orange-600 disabled:opacity-30"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeResetModal}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetLoading || newPassword.trim().length < 6}
                      className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {resetLoading ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
                      ) : (
                        <><KeyRound className="w-4 h-4" /> Reset Password</>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`flex items-start gap-3 p-4 rounded-lg mb-5 ${
                    resetResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    {resetResult.success
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    <p className={`text-sm font-medium ${
                      resetResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>{resetResult.message}</p>
                  </div>

                  {resetResult.success && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">New Password</p>
                        <p className="text-sm font-mono font-semibold text-gray-900">
                          {showPassword ? newPassword : '••••••••'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setShowPassword(p => !p)} className="p-1.5 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={copyPassword} className="p-1.5 text-gray-400 hover:text-orange-600">
                          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={closeResetModal}
                    className="w-full px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition-colors"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}