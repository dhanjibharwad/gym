'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User, Mail, Phone, Calendar, MapPin, Briefcase, Users,
  CreditCard, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Heart, Activity, FileText, DollarSign, TrendingUp, Pause, Play, History,
  Edit, Save, X, Printer, Trash2
} from 'lucide-react';
import Toast from '@/app/components/Toast';
import { usePermission } from '@/components/rbac/PermissionGate';
import MembershipReceipt from '@/components/MembershipReceipt';
import GymLoader from '@/components/GymLoader';

interface Member {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  age: number;
  occupation: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  profile_photo_url: string;
  created_at: string;
}

interface Membership {
  id: number;
  start_date: string;
  end_date: string;
  status: string;
  trainer_assigned: string;
  batch_time: string;
  membership_types: string[];
  reference_of_admission: string;
  locker_required: boolean;
  plan_name: string;
  duration_months: number;
  plan_price: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  is_on_hold: boolean;
  hold_start_date: string;
  hold_end_date: string;
  hold_reason: string;
  hold_history?: HoldHistory[];
}

interface HoldHistory {
  id: number;
  hold_start_date: string;
  hold_end_date: string;
  hold_reason: string;
  days_on_hold: number;
  resumed_at: string;
  created_at: string;
}

interface Payment {
  id: number;
  membership_id: number;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  payment_status: string;
  next_due_date: string;
  created_at: string;
}

interface Transaction {
  id: number;
  payment_id: number;
  member_id: number;
  membership_id: number;
  transaction_type: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  transaction_date: string;
  description: string;
  receipt_number: string;
  reference_number: string;
}

interface MedicalInfo {
  id: number;
  member_id: number;
  medical_conditions: string;
  injuries_limitations: string;
  additional_notes: string;
  created_at: string;
  updated_at: string;
}

interface PaymentSummary {
  id: number;
  member_id: number;
  total_paid: number;
  total_pending: number;
  last_payment_date: string;
  last_payment_amount: number;
  payment_count: number;
}

interface ReceiptTemplate {
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  gymEmail: string;
  gymWebsite: string;
  formTitle: string;
  headerColor: string;
  logoUrl: string;
  rulesAndRegulations: string[];
  showPhotoPlaceholder: boolean;
  showSignatureSection: boolean;
  footerText: string;
}

const MemberProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id;
  const { can } = usePermission();

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [holdDuration, setHoldDuration] = useState({ value: '', unit: 'days' });
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedResumeMembershipId, setSelectedResumeMembershipId] = useState<number | null>(null);
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Member> & { medical_conditions?: string; injuries_limitations?: string; additional_notes?: string }>({});
  const [saving, setSaving] = useState(false);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptMembership, setSelectedReceiptMembership] = useState<Membership | null>(null);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (memberId) {
      fetchMemberData();
      fetchReceiptTemplate();
    }
  }, [memberId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}`);
      const data = await response.json();
      
      if (data.success) {
        setMember(data.member);
        setMemberships(data.memberships || []);
        setPayments(data.payments || []);
        setTransactions(data.transactions || []);
        setMedicalInfo(data.medicalInfo);
        setPaymentSummary(data.paymentSummary);
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptTemplate = async () => {
    try {
      const response = await fetch('/api/settings/receipt-template', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      if (data.success && data.template) {
        setReceiptTemplate(data.template);
      }
    } catch (error) {
      console.error('Error fetching receipt template:', error);
    }
  };

  const handleEditClick = () => {
    if (!member) return;
    setEditFormData({
      full_name: member.full_name,
      phone_number: member.phone_number,
      email: member.email,
      gender: member.gender,
      date_of_birth: member.date_of_birth,
      occupation: member.occupation,
      address: member.address,
      emergency_contact_name: member.emergency_contact_name,
      emergency_contact_phone: member.emergency_contact_phone,
      medical_conditions: medicalInfo?.medical_conditions || '',
      injuries_limitations: medicalInfo?.injuries_limitations || '',
      additional_notes: medicalInfo?.additional_notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      
      const result = await response.json();
      if (result.success) {
        showToast('Member updated successfully', 'success');
        setShowEditModal(false);
        fetchMemberData();
      } else {
        showToast(result.message || 'Failed to update member', 'error');
      }
    } catch (error) {
      showToast('Failed to update member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!member) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (result.success) {
        showToast('Member deleted successfully', 'success');
        setShowDeleteModal(false);
        // Redirect to members list
        router.push('/dashboard/members');
      } else {
        showToast(result.message || 'Failed to delete member', 'error');
        setDeleting(false);
      }
    } catch (error) {
      showToast('Failed to delete member', 'error');
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-blue-100 text-blue-800'
    };
    return styles[status as keyof typeof styles] || styles.inactive;
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      full: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <GymLoader size="lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg font-medium">Member not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const activeMemberships = memberships.filter(m => m.status === 'active' || m.status === 'on_hold');
  const expiredMemberships = memberships.filter(m => m.status === 'expired');

  const getPaymentsForMembership = (membershipId: number) => {
    return payments.filter(p => p.membership_id === membershipId);
  };
  
  const getTransactionsForMembership = (membershipId: number) => {
    return transactions.filter(t => t.membership_id === membershipId);
  };

  const handlePrintReceipt = (membership: Membership) => {
    setSelectedReceiptMembership(membership);
    setShowReceiptModal(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && receiptRef.current) {
      const printContent = receiptRef.current.outerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Membership Receipt - ${member?.full_name}</title>
            <meta charset="utf-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .receipt-container {
                width: 210mm !important;
                min-height: 297mm !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
                padding: 10mm !important;
                background: white !important;
              }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleHoldMembership = (membershipId: number) => {
    setSelectedMembershipId(membershipId);
    setShowHoldModal(true);
  };

  const handleResumeMembership = (membershipId: number) => {
    setSelectedResumeMembershipId(membershipId);
    setShowResumeModal(true);
  };

  const confirmResumeMembership = async () => {
    if (!selectedResumeMembershipId) return;
    
    setProcessing(true);
    setShowResumeModal(false);
    try {
      const response = await fetch(`/api/members/${memberId}/memberships/${selectedResumeMembershipId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' })
      });
      
      const result = await response.json();
      if (result.success) {
        showToast(result.message, 'success');
        fetchMemberData();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Failed to resume membership', 'error');
    } finally {
      setProcessing(false);
      setSelectedResumeMembershipId(null);
    }
  };

  const submitHold = async () => {
    if (!holdReason.trim()) {
      showToast('Please provide a reason for holding the membership', 'error');
      return;
    }
    
    if (!holdDuration.value || parseInt(holdDuration.value) <= 0) {
      showToast('Please provide a valid hold duration', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/members/${memberId}/memberships/${selectedMembershipId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'hold', 
          hold_reason: holdReason,
          hold_duration: parseInt(holdDuration.value),
          hold_unit: holdDuration.unit
        })
      });
      
      const result = await response.json();
      if (result.success) {
        showToast(result.message, 'success');
        setShowHoldModal(false);
        setHoldReason('');
        setHoldDuration({ value: '', unit: 'days' });
        fetchMemberData();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Failed to hold membership', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Resume Confirmation Modal */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-green-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Resume Membership</h3>
                <p className="text-sm text-gray-600">Confirm to continue</p>
              </div>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                The membership will be resumed and the <span className="font-bold text-green-700">end date will be extended</span> by the number of days it was on hold.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmResumeMembership}
                disabled={processing}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {processing ? 'Processing...' : (
                  <><Play className="w-5 h-5" /> Resume Membership</>
                )}
              </button>
              <button
                onClick={() => { setShowResumeModal(false); setSelectedResumeMembershipId(null); }}
                disabled={processing}
                className="px-5 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Hold Membership</h3>
            <p className="text-sm text-gray-600 mb-4">The membership will be paused and the end date will be extended when resumed.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hold Duration *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={holdDuration.value}
                    onChange={(e) => setHoldDuration({ ...holdDuration, value: e.target.value })}
                    placeholder="Enter duration"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={holdDuration.unit}
                    onChange={(e) => setHoldDuration({ ...holdDuration, unit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Hold *</label>
                <textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Enter reason for holding"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={submitHold}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Hold Membership'}
              </button>
              <button
                onClick={() => { setShowHoldModal(false); setHoldReason(''); setHoldDuration({ value: '', unit: 'days' }); }}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Edit className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Member</h3>
                  <p className="text-sm text-gray-600">Update member information</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={editFormData.full_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={editFormData.phone_number || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={editFormData.gender || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editFormData.date_of_birth || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={editFormData.occupation || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Address
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editFormData.emergency_contact_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={editFormData.emergency_contact_phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Medical Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
                    <textarea
                      value={editFormData.medical_conditions || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, medical_conditions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={2}
                      placeholder="Any medical conditions..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Injuries & Limitations</label>
                    <textarea
                      value={editFormData.injuries_limitations || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, injuries_limitations: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={2}
                      placeholder="Any injuries or physical limitations..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea
                      value={editFormData.additional_notes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, additional_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={2}
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="px-5 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Member</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                Are you sure you want to delete <strong>{member?.full_name}</strong>? 
                This will permanently remove the member and all their membership history.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteMember}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {deleting ? 'Deleting...' : <><Trash2 className="w-4 h-4" /> Delete Member</>}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-black hover:border-black hover:text-white transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Member Profile</h1>
            <p className="text-sm text-gray-500">View member details and membership history</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {can('edit_members') && (
            <button
              onClick={handleEditClick}
              className="group flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Edit Member</span>
            </button>
          )}
          {can('delete_members') && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Member Info Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-black px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {member.profile_photo_url ? (
                <img
                  src={member.profile_photo_url}
                  alt={member.full_name}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white bg-white flex items-center justify-center">
                  <span className="text-3xl font-bold text-black">
                    {member.full_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="text-white">
                <h2 className="text-3xl font-bold">{member.full_name}</h2>
                <p className="text-gray-300 mt-1 text-sm">Member ID: #{member.id}</p>
              </div>
            </div>
            <div className="text-right text-white">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Joined</p>
              <p className="text-sm font-semibold">{formatDate(member.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
              <Phone className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
              <p className="font-semibold text-gray-900">{member.phone_number}</p>
            </div>
          </div>

          {member.email && (
            <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                <Mail className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                <p className="font-semibold text-gray-900">{member.email}</p>
              </div>
            </div>
          )}

          <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
              <User className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</p>
              <p className="font-semibold text-gray-900">{member.gender || 'N/A'}</p>
            </div>
          </div>

          <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
              <Calendar className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</p>
              <p className="font-semibold text-gray-900">
                {member.date_of_birth ? formatDate(member.date_of_birth) : 'N/A'}
              </p>
            </div>
          </div>

          {member.occupation && (
            <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                <Briefcase className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</p>
                <p className="font-semibold text-gray-900">{member.occupation}</p>
              </div>
            </div>
          )}

          {member.address && (
            <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                <MapPin className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                <p className="font-semibold text-gray-900">{member.address}</p>
              </div>
            </div>
          )}

          {member.emergency_contact_name && (
            <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-black transition-colors">
                <Users className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Emergency Contact</p>
                <p className="font-semibold text-gray-900">{member.emergency_contact_name}</p>
                <p className="text-sm text-gray-500">{member.emergency_contact_phone}</p>
              </div>
            </div>
          )}
        </div>

        {medicalInfo && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Medical Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Medical Conditions</p>
                <p className="text-gray-900 font-medium">{medicalInfo.medical_conditions || 'None'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Injuries & Limitations</p>
                <p className="text-gray-900 font-medium">{medicalInfo.injuries_limitations || 'None'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Additional Notes</p>
                <p className="text-gray-900 font-medium">{medicalInfo.additional_notes || 'None'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Memberships */}
      {activeMemberships.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Active Memberships</h3>
                  <p className="text-green-100 text-sm">Currently enrolled plans</p>
                </div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-xl">
                <p className="text-white font-bold text-lg">{activeMemberships.length}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {activeMemberships.map((membership) => (
              <div key={membership.id} className="bg-white rounded-xl shadow-md border-l-4 border-green-500 p-5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-gray-900">{membership.plan_name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusBadge(membership.status)}`}>
                        {membership.status === 'on_hold' ? (
                          <><Pause className="w-3 h-3" /> ON HOLD</>
                        ) : (
                          <><CheckCircle className="w-3 h-3" /> ACTIVE</>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      {membership.duration_months} months • ₹{membership.plan_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrintReceipt(membership)}
                      className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Print Receipt
                    </button>
                    {membership.status === 'active' && (
                      <button
                        onClick={() => handleHoldMembership(membership.id)}
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Pause className="w-4 h-4" /> Hold
                      </button>
                    )}
                    {membership.status === 'on_hold' && (
                      <button
                        onClick={() => handleResumeMembership(membership.id)}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md flex items-center gap-1"
                      >
                        <Play className="w-4 h-4" /> Resume
                      </button>
                    )}
                  </div>
                </div>
                
                {membership.is_on_hold && membership.hold_start_date && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900">Membership On Hold</p>
                        <div className="text-xs text-blue-700 mt-1 space-y-1">
                          <p>Since: {formatDate(membership.hold_start_date)}</p>
                          {membership.hold_end_date && (
                            <p>Until: {formatDate(membership.hold_end_date)}</p>
                          )}
                          {membership.hold_reason && (
                            <p className="text-blue-600">Reason: {membership.hold_reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(membership.start_date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="font-semibold text-gray-900">{formatDate(membership.end_date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Batch Time</p>
                    <p className="font-semibold text-gray-900">{membership.batch_time}</p>
                  </div>
                  {membership.trainer_assigned && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Trainer</p>
                      <p className="font-semibold text-gray-900">{membership.trainer_assigned}</p>
                    </div>
                  )}
                  {membership.locker_required && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Locker</p>
                      <p className="font-semibold text-gray-900">Required</p>
                    </div>
                  )}
                  {membership.reference_of_admission && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Reference</p>
                      <p className="font-semibold text-gray-900">{membership.reference_of_admission}</p>
                    </div>
                  )}
                  {membership.membership_types && membership.membership_types.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Membership Types</p>
                      <p className="font-semibold text-gray-900">{membership.membership_types.join(', ')}</p>
                    </div>
                  )}
                </div>

                {/* Hold History */}
                {membership.hold_history && membership.hold_history.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-semibold text-gray-900 mb-3 hover:text-orange-600 flex items-center gap-2">
                        <History className="w-4 h-4" /> Hold History ({membership.hold_history.length})
                      </summary>
                      <div className="space-y-2 mt-3">
                        {membership.hold_history.map((hold) => {
                          const actualStart = new Date(hold.hold_start_date);
                          const actualEnd = hold.hold_end_date ? new Date(hold.hold_end_date) : null;
                          const wasResumedEarly = hold.resumed_at && actualEnd;
                          
                          return (
                            <div key={hold.id} className="bg-blue-50 rounded-lg p-3 text-xs border border-blue-200">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-blue-900 mb-1">Hold Period</p>
                                  <p className="text-blue-700">Started: {formatDate(hold.hold_start_date)}</p>
                                  {actualEnd && (
                                    <p className="text-blue-700">Ended: {formatDate(hold.hold_end_date)}</p>
                                  )}
                                  {!actualEnd && <p className="text-orange-600 font-semibold">Status: Ongoing</p>}
                                </div>
                                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold">
                                  {hold.days_on_hold} {hold.days_on_hold === 1 ? 'day' : 'days'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-blue-600"><span className="font-semibold">Reason:</span> {hold.hold_reason}</p>
                                {hold.resumed_at && (
                                  <p className="text-green-600 font-semibold flex items-start gap-1">
                                    <CheckCircle className="w-3 h-3 mt-0.5" /> Resumed: {new Date(hold.resumed_at).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {wasResumedEarly && <span className="text-xs"> (manually resumed)</span>}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                )}

                {/* Payment Details */}
                {(getPaymentsForMembership(membership.id).length > 0 || getTransactionsForMembership(membership.id).length > 0) && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Payment Details
                    </h5>
                    {getPaymentsForMembership(membership.id).map((payment) => (
                      <div key={payment.id} className="bg-green-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-600">Total Amount</p>
                            <p className="font-bold text-gray-900">₹{payment.total_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Paid Amount</p>
                            <p className="font-bold text-green-700">₹{payment.paid_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getPaymentStatusBadge(payment.payment_status)}`}>
                              {payment.payment_status.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Payment Mode</p>
                            <p className="font-bold text-gray-900">{payment.payment_mode}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {getTransactionsForMembership(membership.id).length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900">View Transaction History ({getTransactionsForMembership(membership.id).length})</summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-green-100">
                              <tr>
                                <th className="px-2 py-2 text-left font-semibold">Date</th>
                                <th className="px-2 py-2 text-left font-semibold">Type</th>
                                <th className="px-2 py-2 text-left font-semibold">Amount</th>
                                <th className="px-2 py-2 text-left font-semibold">Mode</th>
                                <th className="px-2 py-2 text-left font-semibold">Reference</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-green-100">
                              {getTransactionsForMembership(membership.id).map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-green-50">
                                  <td className="px-2 py-2">{formatDate(transaction.transaction_date)}</td>
                                  <td className="px-2 py-2 capitalize">{transaction.transaction_type.replace(/_/g, ' ')}</td>
                                  <td className="px-2 py-2 font-semibold text-green-700">₹{transaction.amount}</td>
                                  <td className="px-2 py-2">{transaction.payment_mode}</td>
                                  <td className="px-2 py-2">{transaction.reference_number || transaction.receipt_number || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 border-t pt-3">
                  Created by {membership.created_by_name || `User #${membership.created_by}`} • {new Date(membership.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Memberships */}
      {expiredMemberships.length > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl shadow-lg border-2 border-gray-300 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-slate-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Expired Memberships</h3>
                  <p className="text-gray-200 text-sm">Past membership history</p>
                </div>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-xl">
                <p className="text-white font-bold text-lg">{expiredMemberships.length}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {expiredMemberships.map((membership) => (
              <div key={membership.id} className="bg-white rounded-xl shadow-md border-l-4 border-gray-400 p-5 opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-gray-700">{membership.plan_name}</h4>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> EXPIRED
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {membership.duration_months} months • ₹{membership.plan_price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="font-semibold text-gray-700">{formatDate(membership.start_date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="font-semibold text-red-600">{formatDate(membership.end_date)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Batch Time</p>
                    <p className="font-semibold text-gray-700">{membership.batch_time}</p>
                  </div>
                  {membership.trainer_assigned && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Trainer</p>
                      <p className="font-semibold text-gray-700">{membership.trainer_assigned}</p>
                    </div>
                  )}
                  {membership.locker_required && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Locker</p>
                      <p className="font-semibold text-gray-700">Required</p>
                    </div>
                  )}
                  {membership.reference_of_admission && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Reference</p>
                      <p className="font-semibold text-gray-700">{membership.reference_of_admission}</p>
                    </div>
                  )}
                  {membership.membership_types && membership.membership_types.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Membership Types</p>
                      <p className="font-semibold text-gray-700">{membership.membership_types.join(', ')}</p>
                    </div>
                  )}
                </div>

                {/* Payment Details */}
                {(getPaymentsForMembership(membership.id).length > 0 || getTransactionsForMembership(membership.id).length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Payment Details
                    </h5>
                    {getPaymentsForMembership(membership.id).map((payment) => (
                      <div key={payment.id} className="bg-gray-100 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-600">Total Amount</p>
                            <p className="font-bold text-gray-900">₹{payment.total_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Paid Amount</p>
                            <p className="font-bold text-green-700">₹{payment.paid_amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getPaymentStatusBadge(payment.payment_status)}`}>
                              {payment.payment_status.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Payment Mode</p>
                            <p className="font-bold text-gray-900">{payment.payment_mode}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {getTransactionsForMembership(membership.id).length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900">View Transaction History ({getTransactionsForMembership(membership.id).length})</summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-200">
                              <tr>
                                <th className="px-2 py-2 text-left font-semibold">Date</th>
                                <th className="px-2 py-2 text-left font-semibold">Type</th>
                                <th className="px-2 py-2 text-left font-semibold">Amount</th>
                                <th className="px-2 py-2 text-left font-semibold">Mode</th>
                                <th className="px-2 py-2 text-left font-semibold">Reference</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {getTransactionsForMembership(membership.id).map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-100">
                                  <td className="px-2 py-2">{formatDate(transaction.transaction_date)}</td>
                                  <td className="px-2 py-2 capitalize">{transaction.transaction_type.replace(/_/g, ' ')}</td>
                                  <td className="px-2 py-2 font-semibold text-green-700">₹{transaction.amount}</td>
                                  <td className="px-2 py-2">{transaction.payment_mode}</td>
                                  <td className="px-2 py-2">{transaction.reference_number || transaction.receipt_number || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 border-t pt-3">
                  Created by {membership.created_by_name || `User #${membership.created_by}`} • {new Date(membership.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceiptMembership && member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Printer className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Membership Receipt</h3>
                  <p className="text-sm text-gray-600">Preview and print member receipt</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => { setShowReceiptModal(false); setSelectedReceiptMembership(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="p-6 bg-gray-100">
              <div ref={receiptRef} className="bg-white shadow-lg">
                <MembershipReceipt
                  member={{
                    ...member,
                    medical_conditions: medicalInfo?.medical_conditions || 'None'
                  }}
                  membership={selectedReceiptMembership}
                  payment={getPaymentsForMembership(selectedReceiptMembership.id)[0] || null}
                  receiptNumber={`REC-${selectedReceiptMembership.id}-${Date.now()}`}
                  template={receiptTemplate}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberProfilePage;
