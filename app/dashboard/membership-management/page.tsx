'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Dumbbell, 
  CreditCard, 
  Calendar, 
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import Toast from '@/app/components/Toast';
import { PageGuard } from '@/components/rbac/PageGuard';

interface Member {
  id: number;
  member_number: string;
  full_name: string;
  phone_number: string;
  email?: string;
  created_at: string;
  membership_status: 'none' | 'active' | 'expired';
  membership_details?: {
    plan_name: string;
    start_date: string;
    end_date: string;
    trainer_assigned?: string;
    batch_time?: string;
  };
}

interface MembershipPlan {
  id: number;
  plan_name: string;
  duration_months: number;
  price: number;
}

const MembershipDashboard = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | 'active' | 'expired'>('all');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  
  // Bulk assignment form state
  const [selectedPlan, setSelectedPlan] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainerAssigned, setTrainerAssigned] = useState('');
  const [batchTime, setBatchTime] = useState('Flexible');
  const [processing, setProcessing] = useState(false);
  
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'success'});

  useEffect(() => {
    fetchMembers();
    fetchPlans();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members/with-membership-status');
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/membership-plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({show: true, message, type});
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000);
  };

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectFilteredMembers = () => {
    const filteredMembers = membersWithoutMembership.map(m => m.id);
    setSelectedMembers(filteredMembers);
  };

  const handleBulkAssignment = async () => {
    if (selectedMembers.length === 0) {
      showToast('Please select at least one member', 'error');
      return;
    }

    if (!selectedPlan) {
      showToast('Please select a membership plan', 'error');
      return;
    }

    setProcessing(true);
    try {
      const membersData = selectedMembers.map(memberId => ({ memberId }));
      
      const requestBody = {
        members: membersData,
        membership: {
          planId: parseInt(selectedPlan),
          startDate,
          trainerAssigned,
          batchTime,
        },
        assignMembership: true,
        processPayment: false
      };

      const response = await fetch('/api/members/bulk-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        showToast(`Successfully assigned membership to ${result.successCount} members`, 'success');
        setSelectedMembers([]);
        setShowBulkAssign(false);
        fetchMembers(); // Refresh the list
      } else {
        showToast(result.message || 'Assignment failed', 'error');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      showToast('Assignment failed. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredMembersList = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.member_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phone_number.includes(searchTerm);
    
    const matchesFilter = statusFilter === 'all' || member.membership_status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'none':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      none: 'bg-orange-100 text-orange-700'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {getStatusIcon(status)}
        {status === 'none' ? 'No Membership' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const membersWithoutMembership = filteredMembersList.filter(m => m.membership_status === 'none');
  const membersWithActiveMembership = filteredMembersList.filter(m => m.membership_status === 'active');
  const membersWithExpiredMembership = filteredMembersList.filter(m => m.membership_status === 'expired');

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({show: false, message: '', type: 'success'})} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membership Management</h1>
        <p className="text-gray-600 mt-1">View and manage member memberships</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Members</p>
              <p className="text-2xl font-bold text-slate-900">{filteredMembersList.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">No Membership</p>
              <p className="text-2xl font-bold text-orange-600">{membersWithoutMembership.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{membersWithActiveMembership.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{membersWithExpiredMembership.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, member number, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="none">No Membership</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Assignment Actions */}
      {membersWithoutMembership.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">
                  {membersWithoutMembership.length} members without membership
                </p>
                <p className="text-sm text-orange-700">
                  Select them below to assign membership in bulk
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectFilteredMembers}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Select All ({membersWithoutMembership.length})
              </button>
              {selectedMembers.length > 0 && (
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  Assign Membership ({selectedMembers.length})
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Members</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={membersWithoutMembership.length > 0 && selectedMembers.length === membersWithoutMembership.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers(membersWithoutMembership.map(m => m.id));
                        } else {
                          setSelectedMembers([]);
                        }
                      }}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Membership Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {membersWithoutMembership.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-slate-900">{member.full_name}</p>
                        <p className="text-sm text-slate-500">{member.member_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-slate-900">{member.phone_number}</p>
                        {member.email && <p className="text-sm text-slate-500">{member.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member.membership_status)}
                    </td>
                    <td className="px-6 py-4">
                      {member.membership_details ? (
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">{member.membership_details.plan_name}</p>
                          <p className="text-slate-500">
                            {new Date(member.membership_details.start_date).toLocaleDateString()} - {new Date(member.membership_details.end_date).toLocaleDateString()}
                          </p>
                          {member.membership_details.trainer_assigned && (
                            <p className="text-slate-500">Trainer: {member.membership_details.trainer_assigned}</p>
                          )}
                          {member.membership_details.batch_time && (
                            <p className="text-slate-500">Batch: {member.membership_details.batch_time}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No membership assigned</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {membersWithoutMembership.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No members found matching your criteria
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Assignment Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Assign Membership</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Membership Plan <span className="text-orange-600">*</span>
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_name} - ₹{plan.price} ({plan.duration_months} months)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Start Date <span className="text-orange-600">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Trainer Assigned
                </label>
                <input
                  type="text"
                  value={trainerAssigned}
                  onChange={(e) => setTrainerAssigned(e.target.value)}
                  placeholder="Enter trainer name"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Batch Time
                </label>
                <select
                  value={batchTime}
                  onChange={(e) => setBatchTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent transition-all"
                >
                  <option value="Flexible">Flexible</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Assigning to:</span> {selectedMembers.length} members
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBulkAssign(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignment}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Assigning...' : 'Assign Membership'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function MembershipDashboardWrapper() {
  return (
    <PageGuard>
      <MembershipDashboard />
    </PageGuard>
  );
}
