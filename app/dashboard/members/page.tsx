'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Grid3X3,
  List,
  Edit,
  Save,
  X
} from 'lucide-react';

interface Member {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  profile_photo_url: string;
  created_at: string;
  start_date: string;
  end_date: string;
  membership_status: string;
  trainer_assigned: string;
  batch_time: string;
  membership_type: string;
  locker_required: boolean;
  plan_name: string;
  duration_months: number;
  plan_price: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_mode: string;
  next_due_date: string;
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ phone_number: '', email: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleEditMember = (member: Member) => {
    setEditingMember(member.id);
    setEditForm({
      phone_number: member.phone_number,
      email: member.email || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditForm({ phone_number: '', email: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/members/${editingMember}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: editForm.phone_number,
          email: editForm.email
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMembers(prev => prev.map(member => 
            member.id === editingMember 
              ? { ...member, phone_number: editForm.phone_number, email: editForm.email }
              : member
          ));
          handleCancelEdit();
        }
      }
    } catch (error) {
      console.error('Error updating member:', error);
    } finally {
      setUpdating(false);
    }
  };

  const fetchMembers = async () => {
    try {
      console.log('Fetching members...');
      const response = await fetch('/api/members');
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('API result:', result);
      
      if (result.success) {
        setMembers(result.members);
        console.log('Members set:', result.members.length);
      } else {
        console.error('API returned error:', result.message);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phone_number.includes(searchTerm) ||
                         (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || member.membership_status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || member.payment_status === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const getStatusBadge = (status: string) => {
    if (!status) status = 'inactive';
    
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
      expired: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      suspended: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    if (!status) status = 'pending';
    
    const paymentConfig = {
      full: { bg: 'bg-green-100', text: 'text-green-700' },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      pending: { bg: 'bg-red-100', text: 'text-red-700' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700' }
    };
    
    const config = paymentConfig[status as keyof typeof paymentConfig] || paymentConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const isExpiringSoon = (endDate: string) => {
    if (!endDate) return false;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600 mt-1">Manage gym members and their memberships</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Total Members: <span className="font-semibold text-gray-900">{members.length}</span>
          </span>
          
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              {/* <option value="inactive">Inactive</option> */}
              <option value="expired">Expired</option>
              {/* <option value="suspended">Suspended</option> */}
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Payments</option>
              <option value="full">Paid Full</option>
              <option value="partial">Partial</option>
              {/* <option value="pending">Pending</option> */}
            </select>
          </div>
        </div>
      </div>

      {/* Members Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    {/* Member Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {member.profile_photo_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={member.profile_photo_url}
                              alt={member.full_name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {member.full_name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: #{member.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingMember === member.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <input
                              type="tel"
                              value={editForm.phone_number}
                              onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
                            />
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-40"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {member.phone_number}
                          </div>
                          {member.email && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {member.email}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Membership */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {member.plan_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(member.start_date)} - {formatDate(member.end_date)}
                        </div>
                        {isExpiringSoon(member.end_date) && (
                          <div className="text-xs text-amber-600 font-medium">
                            Expires Soon!
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          ₹{member.paid_amount} / ₹{member.total_amount}
                        </div>
                        <div>{getPaymentBadge(member.payment_status)}</div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member.membership_status)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingMember === member.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updating}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Save changes"
                          >
                            {updating ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditMember(member)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit contact info"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding a new member.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {member.profile_photo_url ? (
                        <img
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          src={member.profile_photo_url}
                          alt={member.full_name}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center border-2 border-gray-200">
                          <span className="text-xl font-bold text-white">
                            {member.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {member.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">ID: #{member.id}</p>
                      <div className="mt-1">
                        {getStatusBadge(member.membership_status)}
                      </div>
                    </div>
                  </div>
                  {isExpiringSoon(member.end_date) && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Expires Soon!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 pb-4 space-y-3">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {member.phone_number}
                  </div>
                  {member.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {member.email}
                    </div>
                  )}
                </div>

                {/* Membership Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{member.plan_name}</span>
                    <span className="text-sm text-gray-500">{member.membership_type}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(member.start_date)} - {formatDate(member.end_date)}
                  </div>
                  {member.trainer_assigned && (
                    <div className="text-xs text-gray-500 mt-1">
                      Trainer: {member.trainer_assigned}
                    </div>
                  )}
                  {member.batch_time && (
                    <div className="text-xs text-gray-500">
                      Batch: {member.batch_time}
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      ₹{member.paid_amount} / ₹{member.total_amount}
                    </div>
                    <div className="text-xs text-gray-500">{member.payment_mode}</div>
                  </div>
                  <div>{getPaymentBadge(member.payment_status)}</div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Joined {formatDate(member.created_at)}
                </div>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding a new member.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Members
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {members.filter(m => m.membership_status === 'active').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Expiring Soon
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {members.filter(m => isExpiringSoon(m.end_date)).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Paid Full
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {members.filter(m => m.payment_status === 'full').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Payments
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {members.filter(m => m.payment_status === 'pending' || m.payment_status === 'partial').length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembersPage;