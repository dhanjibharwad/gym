'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  Phone,
  Calendar,
  CreditCard,
  DollarSign,
  Clock,
  Receipt,
  Banknote,
  Plus,
  AlertTriangle,
  ArrowLeft,
  Filter
} from 'lucide-react';

interface MemberTransaction {
  id: number;
  member_id: number;
  membership_id: number;
  transaction_type: string;
  amount: number;
  payment_mode: string;
  transaction_date: string;
  receipt_number: string;
  created_by?: string;
  created_at: string;
  full_name: string;
  phone_number: string;
  profile_photo_url: string;
  plan_name: string;
  total_amount: number;
  remaining_amount?: number;
  payment_status: string;
}

interface Member {
  id: number;
  full_name: string;
  phone_number: string;
  profile_photo_url: string;
}

const HistoryPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberTransactions, setMemberTransactions] = useState<MemberTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      const result = await response.json();
      
      if (result.success) {
        setMembers(result.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberTransactions = async (memberId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments/member-history?member_id=${memberId}`);
      const result = await response.json();
      
      if (result.success) {
        setMemberTransactions(result.transactions);
      }
    } catch (error) {
      console.error('Error fetching member transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSelect = async (member: Member) => {
    setSelectedMember(member);
    await fetchMemberTransactions(member.id);
  };

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone_number.includes(searchTerm)
  );

  const filteredTransactions = memberTransactions.filter(transaction => {
    const matchesType = transactionFilter === 'all' || transaction.transaction_type === transactionFilter;
    const matchesMode = paymentModeFilter === 'all' || transaction.payment_mode === paymentModeFilter;
    return matchesType && matchesMode;
  });

  const getTransactionTypeIcon = (type: string) => {
    const typeConfig = {
      membership_fee: { icon: CreditCard, color: 'text-blue-600', label: 'Membership Fee' },
      additional_payment: { icon: Plus, color: 'text-green-600', label: 'Additional Payment' },
      renewal: { icon: Calendar, color: 'text-purple-600', label: 'Renewal' },
      refund: { icon: AlertTriangle, color: 'text-red-600', label: 'Refund' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.additional_payment;
    const Icon = config.icon;
    
    return { icon: <Icon className={`w-4 h-4 ${config.color}`} />, label: config.label, color: config.color };
  };

  const getPaymentModeIcon = (mode: string) => {
    const modeConfig = {
      Cash: { icon: Banknote, color: 'text-green-600' },
      UPI: { icon: CreditCard, color: 'text-blue-600' },
      Card: { icon: CreditCard, color: 'text-purple-600' },
      Online: { icon: CreditCard, color: 'text-indigo-600' }
    };
    
    const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.Cash;
    const Icon = config.icon;
    
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading && !selectedMember) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-1">View detailed transaction history for members</p>
        </div>
        {selectedMember && (
          <button
            onClick={() => {
              setSelectedMember(null);
              setMemberTransactions([]);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Members
          </button>
        )}
      </div>

      {!selectedMember ? (
        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search members by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Member</h3>
              <p className="text-sm text-gray-600 mt-1">Choose a member to view their payment history</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {member.profile_photo_url ? (
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={member.profile_photo_url}
                          alt={member.full_name}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                          <span className="text-lg font-medium text-white">
                            {member.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{member.full_name}</h4>
                      <p className="text-sm text-gray-500">{member.phone_number}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Member Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {selectedMember.profile_photo_url ? (
                  <img
                    className="h-16 w-16 rounded-full object-cover"
                    src={selectedMember.profile_photo_url}
                    alt={selectedMember.full_name}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                    <span className="text-xl font-medium text-white">
                      {selectedMember.full_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{selectedMember.full_name}</h2>
                <p className="text-gray-600">{selectedMember.phone_number}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>Total Transactions: {memberTransactions.length}</span>
                  <span>Total Paid: {formatCurrency(memberTransactions.reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <select
                  value={transactionFilter}
                  onChange={(e) => setTransactionFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="membership_fee">Membership Fee</option>
                  <option value="additional_payment">Additional Payment</option>
                  <option value="renewal">Renewal</option>
                  <option value="refund">Refund</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <select
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online Transfer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transaction Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
              <p className="text-sm text-gray-600 mt-1">Complete payment timeline for {selectedMember.full_name}</p>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-6">
                  {filteredTransactions.map((transaction, index) => {
                    const typeInfo = getTransactionTypeIcon(transaction.transaction_type);
                    const isLast = index === filteredTransactions.length - 1;
                    
                    return (
                      <div key={transaction.id} className="relative">
                        {!isLast && (
                          <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                        )}
                        
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                            {typeInfo.icon}
                          </div>
                          
                          <div className="flex-1 bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{typeInfo.label}</h4>
                                <p className="text-xs text-gray-500">{transaction.plan_name}</p>
                                <p className="text-xs text-orange-600">Added by: {transaction.created_by || '-'}</p>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">{formatCurrency(parseFloat(transaction.amount.toString()) || 0)}</p>
                                <p className="text-xs text-gray-500">{formatDateTime(transaction.transaction_date)}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Payment Mode:</span>
                                <div className="flex items-center gap-1 mt-1">
                                  {getPaymentModeIcon(transaction.payment_mode)}
                                  <span className="font-medium">{transaction.payment_mode}</span>
                                </div>
                              </div>
                              
                              <div>
                                <span className="text-gray-500">Total Amount:</span>
                                <p className="font-medium mt-1">{formatCurrency(parseFloat(transaction.total_amount.toString()) || 0)}</p>
                              </div>
                              
                              <div>
                                <span className="text-gray-500">Remaining:</span>
                                <p className="font-medium text-red-600 mt-1">{formatCurrency(parseFloat(transaction.remaining_amount?.toString() || '0') || 0)}</p>
                              </div>
                            </div>
                            
                            {transaction.receipt_number && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <span className="text-xs text-gray-500">Reference: </span>
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{transaction.receipt_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {transactionFilter !== 'all' || paymentModeFilter !== 'all'
                      ? 'Try adjusting your filters.'
                      : 'No payment history available for this member.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;