'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  IndianRupee,
  Calendar,
  User,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Receipt,
  Banknote,
  X,
  Save
} from 'lucide-react';
import { cachedFetch, clientCacheDelete, clientCacheGet, clientCacheSet } from '@/lib/clientCache';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission, useUser } from '@/components/rbac/PermissionGate';
import Toast from '@/app/components/Toast';

interface Payment {
  id: number;
  member_id: number;
  membership_id: number;
  full_name: string;
  phone_number: string;
  plan_name: string;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  payment_status: string;
  next_due_date: string;
  created_at: string;
  start_date: string;
  end_date: string;
  profile_photo_url: string;
}

interface PaymentTransaction {
  id: number;
  member_id: number;
  membership_id: number;
  transaction_type: string;
  amount: number;
  payment_mode: string;
  transaction_date: string;
  receipt_number: string;
  reference_number: string;
  created_by?: string;
  created_at: string;
  full_name: string;
  phone_number: string;
  profile_photo_url: string;
  plan_name: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
}

const PaymentsPage = () => {
  const { can } = usePermission();
  const { user: currentUser } = useUser();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [memberTransactions, setMemberTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberForTimeline, setSelectedMemberForTimeline] = useState<Payment | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_mode: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'history'>('summary');

  useEffect(() => {
    const cachedP = clientCacheGet<any>('/api/payments');
    const cachedH = clientCacheGet<any>('/api/payments/history');
    if (cachedP?.success) setPayments(cachedP.payments);
    if (cachedH?.success) setPaymentHistory(cachedH.transactions);
    if (cachedP?.success && cachedH?.success) {
      setLoading(false);
      return;
    }
    Promise.all([
      cachedP?.success ? Promise.resolve(cachedP) : fetch('/api/payments').then(r => r.json()),
      cachedH?.success ? Promise.resolve(cachedH) : fetch('/api/payments/history').then(r => r.json()),
    ]).then(([p, h]) => {
      if (p?.success) { clientCacheSet('/api/payments', p); setPayments(p.payments); }
      if (h?.success) { clientCacheSet('/api/payments/history', h); setPaymentHistory(h.transactions); }
    }).catch(() => {
      setNotification({ type: 'error', message: 'Unable to load payments. Please refresh.' });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showPaymentModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showPaymentModal]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddPayment = (payment: Payment) => {
    const pendingAmount = payment.total_amount - payment.paid_amount;
    setSelectedPayment(payment);
    setNewPayment({
      amount: pendingAmount.toString(),
      payment_mode: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: ''
    });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPayment) return;
    
    const amount = parseFloat(newPayment.amount);
    const maxAmount = selectedPayment.total_amount - selectedPayment.paid_amount;
    
    if (!amount || amount <= 0) {
      setNotification({type: 'error', message: 'Please enter a valid payment amount'});
      return;
    }
    
    if (amount > maxAmount) {
      setNotification({type: 'error', message: `Amount cannot exceed pending amount of ${formatCurrency(maxAmount)}`});
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/payments/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: selectedPayment.member_id,
          membership_id: selectedPayment.membership_id,
          amount,
          payment_mode: newPayment.payment_mode,
          payment_date: newPayment.payment_date,
          reference_number: newPayment.reference_number
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Payment submission failed');
      }
      
      if (result.success) {
        setPayments(prevPayments => 
          prevPayments.map(p => 
            p.membership_id === selectedPayment.membership_id 
              ? {
                  ...p,
                  paid_amount: Number(p.paid_amount) + amount,
                  payment_status: (Number(p.paid_amount) + amount) >= Number(p.total_amount) ? 'full' : 
                                 (Number(p.paid_amount) + amount) > 0 ? 'partial' : 'pending'
                }
              : p
          )
        );
        
        await fetchPayments();
        await fetchPaymentHistory();
        closePaymentModal();
        setNotification({type: 'success', message: 'Payment added successfully!'});
      } else {
        setNotification({type: 'error', message: result.message || 'Failed to add payment'});
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Error adding payment. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchMemberTransactions = async (membershipId: number) => {
    try {
      const response = await fetch(`/api/payments/member-timeline?membership_id=${membershipId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch member transactions');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMemberTransactions(result.transactions);
      } else {
        setNotification({type: 'error', message: 'Failed to load member timeline'});
      }
    } catch (error) {
      console.error('Error fetching member transactions:', error);
      setNotification({type: 'error', message: 'Unable to load member timeline.'});
    }
  };

  const handleViewTimeline = async (payment: Payment) => {
    setSelectedMemberForTimeline(payment);
    await fetchMemberTransactions(payment.membership_id);
    setShowTimelineModal(true);
  };

  const closeTimelineModal = () => {
    setShowTimelineModal(false);
    setSelectedMemberForTimeline(null);
    setMemberTransactions([]);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    setNewPayment({
      amount: '',
      payment_mode: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: ''
    });
  };

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

  const fetchPaymentHistory = async () => {
    try {
      clientCacheDelete('/api/payments/history');
      const result = await cachedFetch<any>('/api/payments/history');
      if (result.success) setPaymentHistory(result.transactions);
    } catch {
      setNotification({type: 'error', message: 'Unable to load payment history.'});
    }
  };

  const fetchPayments = async () => {
    try {
      clientCacheDelete('/api/payments');
      const result = await cachedFetch<any>('/api/payments');
      if (result.success) setPayments(result.payments);
    } catch {
      setNotification({type: 'error', message: 'Unable to load payments. Please refresh the page.'});
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.phone_number.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    const matchesMode = paymentModeFilter === 'all' || payment.payment_mode === paymentModeFilter;
    
    return matchesSearch && matchesStatus && matchesMode;
  });

  const filteredPaymentHistory = paymentHistory.filter(transaction => {
    const matchesSearch = transaction.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.phone_number.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || transaction.payment_status === statusFilter;
    const matchesMode = paymentModeFilter === 'all' || transaction.payment_mode === paymentModeFilter;
    
    return matchesSearch && matchesStatus && matchesMode;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      full: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      pending: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertTriangle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const totalRevenue = payments.reduce((sum, payment) => sum + (Number(payment.paid_amount) || 0), 0);
  const pendingAmount = payments
    .filter(p => p.payment_status === 'pending' || p.payment_status === 'partial')
    .reduce((sum, payment) => sum + ((Number(payment.total_amount) || 0) - (Number(payment.paid_amount) || 0)), 0);
  const fullPayments = payments.filter(p => p.payment_status === 'full').length;
  const overduePayments = payments.filter(p => p.payment_status !== 'full' && isOverdue(p.next_due_date)).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage member payments</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/2 mb-2" /><div className="h-6 bg-gray-200 rounded w-1/3" /></div>)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-1/4" /></div>
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

      {/* Alert for members without membership */}
      {payments.some(p => p.payment_status === 'pending' && p.paid_amount === 0) && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-sm">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-800">Members Needing Membership Assignment</h3>
              <p className="text-sm text-orange-700 mt-1">
                Some members don't have active memberships. Click the button below to assign memberships.
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/membership-management'}
              className="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              Assign Membership
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage member payments</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-4">
          <button
            onClick={() => {
              fetchPayments();
              fetchPaymentHistory();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer shadow-sm"
            title="Refresh payment data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/membership-management'}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer shadow-sm"
            title="Assign memberships to members without one"
          >
            <User className="w-4 h-4" />
            Assign Membership
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>
          <span className="text-sm text-gray-500">
            Total Records: <span className="font-semibold text-gray-900">{viewMode === 'summary' ? filteredPayments.length : filteredPaymentHistory.length}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {can('view_revenue') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <IndianRupee  className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">₹{Math.round(totalRevenue).toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Amount</dt>
                <dd className="text-lg font-medium text-gray-900">₹{Math.round(pendingAmount).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Paid Full</dt>
                <dd className="text-lg font-medium text-gray-900">{fullPayments}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                <dd className="text-lg font-medium text-gray-900">{overduePayments}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 placeholder-slate-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent text-gray-900"
            >
              <option value="all">All Status</option>
              <option value="full">Paid Full</option>
              <option value="partial">Partial</option>
              {/* <option value="pending">Pending</option> */}
              {/* <option value="refunded">Refunded</option> */}
            </select>
          </div>

          <div>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent text-gray-900"
            >
              <option value="all">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Online">Online Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'summary' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Payment Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {payment.profile_photo_url ? (
                            <img className="h-10 w-10 rounded-full object-cover" src={payment.profile_photo_url} alt={payment.full_name} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">{payment.full_name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{payment.full_name}</div>
                          <div className="text-sm text-gray-500">{payment.phone_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.plan_name}</div>
                      <div className="text-sm text-gray-500">{formatDate(payment.start_date)} - {formatDate(payment.end_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.paid_amount)} / {formatCurrency(payment.total_amount)}</div>
                      {payment.payment_status !== 'full' && (
                        <div className="text-sm text-red-600">Pending: {formatCurrency(payment.total_amount - payment.paid_amount)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPaymentModeIcon(payment.payment_mode)}
                        <span className="ml-2 text-sm text-gray-900">{payment.payment_mode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(payment.payment_status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.next_due_date ? (
                        <div className={`text-sm ${isOverdue(payment.next_due_date) && payment.payment_status !== 'full' ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {formatDate(payment.next_due_date)}
                          {isOverdue(payment.next_due_date) && payment.payment_status !== 'full' && <div className="text-xs text-red-500">Overdue</div>}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {can('manage_payments') && (
                          <button 
                            onClick={() => handleAddPayment(payment)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer"
                            title="Add Payment"
                          >
                            <Plus className="w-3 h-3" />
                            Payment
                          </button>
                        )}
                        <button 
                          onClick={() => handleViewTimeline(payment)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer"
                          title="View Timeline"
                        >
                          <Clock className="w-3 h-3" />
                          Timeline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || paymentModeFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'No payment records available.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaymentHistory.map((transaction) => (
            <div key={transaction.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  {transaction.profile_photo_url ? (
                    <img className="h-10 w-10 rounded-full object-cover" src={transaction.profile_photo_url} alt={transaction.full_name} />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{transaction.full_name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{transaction.full_name}</h3>
                  <p className="text-xs text-gray-500">{transaction.phone_number}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900">Amount Paid:</span>
                  <span className="text-lg font-semibold text-green-600">{formatCurrency(transaction.amount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900">Payment Mode:</span>
                  <div className="flex items-center gap-1">
                    {getPaymentModeIcon(transaction.payment_mode)}
                    <span className="text-sm font-medium text-gray-900">{transaction.payment_mode}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900">Payment Date:</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(transaction.transaction_date)}</span>
                </div>
                
                {transaction.receipt_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">Reference:</span>
                    <span className="text-sm font-mono text-gray-900">{transaction.receipt_number}</span>
                  </div>
                )}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-900">Plan:</span>
                    <span className="text-sm font-medium text-gray-900">{transaction.plan_name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-900">Total Amount:</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(transaction.total_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-900">Paid Amount:</span>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(transaction.paid_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">Remaining:</span>
                    <span className="text-sm font-medium text-red-600">{formatCurrency(transaction.total_amount - transaction.paid_amount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-900">Status:</span>
                    {getStatusBadge(transaction.payment_status)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredPaymentHistory.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || paymentModeFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'No transaction records available.'}
              </p>
            </div>
          )}
        </div>
      )}

      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 cursor-pointer">Add Payment</h3>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {selectedPayment.profile_photo_url ? (
                      <img className="h-12 w-12 rounded-full object-cover" src={selectedPayment.profile_photo_url} alt={selectedPayment.full_name} />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                        <span className="text-lg font-medium text-white">{selectedPayment.full_name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedPayment.full_name}</h4>
                    <p className="text-sm text-gray-600">{selectedPayment.phone_number}</p>
                    <p className="text-sm text-gray-600">{selectedPayment.plan_name}</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Previous Payment</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-900">Total Amount:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(selectedPayment.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Paid Amount:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedPayment.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Pending Amount:</span>
                    <span className="font-medium text-red-600">{formatCurrency(selectedPayment.total_amount - selectedPayment.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Payment Date:</span>
                    <span className="font-medium text-gray-900">{formatDate(selectedPayment.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-900">Status:</span>
                    <span>{getStatusBadge(selectedPayment.payment_status)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-4">Add New Payment</h5>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">Adding payment as: <span className="font-medium">{currentUser?.name || '-'}</span></p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
                    <input
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                      min="1"
                      max={selectedPayment.total_amount - selectedPayment.paid_amount}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-gray-900"
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {formatCurrency(selectedPayment.total_amount - selectedPayment.paid_amount)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                    <select
                      value={newPayment.payment_mode}
                      onChange={(e) => setNewPayment({...newPayment, payment_mode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Online">Online Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  
                  {(newPayment.payment_mode === 'UPI' || newPayment.payment_mode === 'Online' || newPayment.payment_mode === 'Card' || newPayment.payment_mode === 'Cheque') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                      <input
                        type="text"
                        value={newPayment.reference_number}
                        onChange={(e) => setNewPayment({...newPayment, reference_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        placeholder="Enter transaction reference"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({...newPayment, payment_date: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closePaymentModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={submitting || !newPayment.amount || parseFloat(newPayment.amount) <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {submitting ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimelineModal && selectedMemberForTimeline && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Payment Timeline - {selectedMemberForTimeline.full_name}</h3>
              <button onClick={closeTimelineModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {memberTransactions.map((transaction) => {
                  const typeInfo = getTransactionTypeIcon(transaction.transaction_type);
                  return (
                    <div key={transaction.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">{typeInfo.icon}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{typeInfo.label}</h4>
                            <p className="text-xs text-gray-500">{formatDateTime(transaction.transaction_date)}</p>
                            <p className="text-xs text-orange-600">Added by: {transaction.created_by || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">{formatCurrency(transaction.amount)}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              {getPaymentModeIcon(transaction.payment_mode)}
                              <span>{transaction.payment_mode}</span>
                            </div>
                          </div>
                        </div>
                        {(transaction.transaction_type === 'membership_fee' ? transaction.reference_number : transaction.receipt_number) && (
                          <p className="text-xs text-gray-500 mt-1">Ref: {transaction.transaction_type === 'membership_fee' ? transaction.reference_number : transaction.receipt_number}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {memberTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
                    <p className="mt-1 text-sm text-gray-500">No payment history available for this member.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with PageGuard to check permissions
export default function PaymentsPageWithGuard() {
  return (
    <PageGuard permissions={['view_payments', 'manage_payments']}>
      <PaymentsPage />
    </PageGuard>
  );
}
