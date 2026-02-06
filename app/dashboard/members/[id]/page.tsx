'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User, Mail, Phone, Calendar, MapPin, Briefcase, Users,
  CreditCard, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Heart, Activity, FileText, DollarSign, TrendingUp
} from 'lucide-react';

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

const MemberProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id;

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) {
      fetchMemberData();
    }
  }, [memberId]);

  const fetchMemberData = async () => {
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

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800'
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Member not found</p>
      </div>
    );
  }

  const activeMemberships = memberships.filter(m => m.status === 'active');
  const expiredMemberships = memberships.filter(m => m.status === 'expired');

  const getPaymentsForMembership = (membershipId: number) => {
    return payments.filter(p => p.membership_id === membershipId);
  };
  
  const getTransactionsForMembership = (membershipId: number) => {
    return transactions.filter(t => t.membership_id === membershipId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Profile</h1>
          <p className="text-gray-600">View member details and membership history</p>
        </div>
      </div>

      {/* Member Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-8">
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
                  <span className="text-3xl font-bold text-orange-600">
                    {member.full_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="text-white">
                <h2 className="text-3xl font-bold">{member.full_name}</h2>
                <p className="text-orange-100 mt-1">Member ID: #{member.id}</p>
              </div>
            </div>
            <div className="text-right text-white">
              <p className="text-xs text-orange-100">Joined</p>
              <p className="text-sm font-medium">{new Date(member.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{member.phone_number}</p>
            </div>
          </div>

          {member.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{member.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium text-gray-900">{member.gender || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium text-gray-900">
                {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {member.occupation && (
            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Occupation</p>
                <p className="font-medium text-gray-900">{member.occupation}</p>
              </div>
            </div>
          )}

          {member.address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{member.address}</p>
              </div>
            </div>
          )}

          {member.emergency_contact_name && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Emergency Contact</p>
                <p className="font-medium text-gray-900">{member.emergency_contact_name}</p>
                <p className="text-sm text-gray-600">{member.emergency_contact_phone}</p>
              </div>
            </div>
          )}
        </div>

        {medicalInfo && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-semibold text-gray-900">Medical Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Medical Conditions</p>
                <p className="text-gray-900 mt-1">{medicalInfo.medical_conditions || 'None'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Injuries & Limitations</p>
                <p className="text-gray-900 mt-1">{medicalInfo.injuries_limitations || 'None'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Additional Notes</p>
                <p className="text-gray-900 mt-1">{medicalInfo.additional_notes || 'None'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Memberships */}
      {activeMemberships.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Memberships</h3>
          <div className="space-y-6">
            {activeMemberships.map((membership) => (
              <div key={membership.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{membership.plan_name}</h4>
                    <p className="text-sm text-gray-600">
                      {membership.duration_months} months - ₹{membership.plan_price}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(membership.status)}`}>
                      {membership.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">Created by: {membership.created_by_name || `User #${membership.created_by}`}</p>
                    <p className="text-xs text-gray-500">{new Date(membership.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">Start Date</p>
                    <p className="font-medium">{new Date(membership.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Date</p>
                    <p className="font-medium">{new Date(membership.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Batch Time</p>
                    <p className="font-medium">{membership.batch_time}</p>
                  </div>
                  {membership.trainer_assigned && (
                    <div>
                      <p className="text-gray-500">Trainer</p>
                      <p className="font-medium">{membership.trainer_assigned}</p>
                    </div>
                  )}
                  {membership.locker_required && (
                    <div>
                      <p className="text-gray-500">Locker</p>
                      <p className="font-medium">Required</p>
                    </div>
                  )}
                  {membership.reference_of_admission && (
                    <div>
                      <p className="text-gray-500">Reference of Admission</p>
                      <p className="font-medium">{membership.reference_of_admission}</p>
                    </div>
                  )}
                  {membership.membership_types && membership.membership_types.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Membership Types</p>
                      <p className="font-medium">{membership.membership_types.join(', ')}</p>
                    </div>
                  )}
                </div>
                
                {/* Payment Summary and Transactions */}
                {(getPaymentsForMembership(membership.id).length > 0 || getTransactionsForMembership(membership.id).length > 0) && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Payment Details</h5>
                    
                    {/* Payment Summary */}
                    {getPaymentsForMembership(membership.id).map((payment) => (
                      <div key={payment.id} className="bg-white/50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Total Amount</p>
                            <p className="font-semibold text-gray-900">₹{payment.total_amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Paid Amount</p>
                            <p className="font-semibold text-green-700">₹{payment.paid_amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(payment.payment_status)}`}>
                              {payment.payment_status}
                            </span>
                          </div>
                          <div>
                            <p className="text-gray-500">Next Due</p>
                            <p className="font-medium text-gray-900">
                              {payment.next_due_date ? new Date(payment.next_due_date).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Transaction History */}
                    {getTransactionsForMembership(membership.id).length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-xs font-semibold text-gray-700 mb-2">Transaction History</h6>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-white/50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Amount</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Mode</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Transcation ID</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-green-100">
                              {getTransactionsForMembership(membership.id).map((transaction) => (
                                <tr key={transaction.id} className="bg-white/30">
                                  <td className="px-3 py-2">{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 capitalize">{transaction.transaction_type.replace(/_/g, ' ')}</td>
                                  <td className="px-3 py-2 font-medium text-green-700">₹{transaction.amount}</td>
                                  <td className="px-3 py-2">{transaction.payment_mode}</td>
                                  <td className="px-3 py-2 text-xs">{transaction.receipt_number || 'N/A'}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(transaction.payment_status)}`}>
                                      {transaction.payment_status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Memberships */}
      {expiredMemberships.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expired Memberships</h3>
          <div className="space-y-6">
            {expiredMemberships.map((membership) => (
              <div key={membership.id} className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{membership.plan_name}</h4>
                    <p className="text-sm text-gray-600">
                      {membership.duration_months} months - ₹{membership.plan_price}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(membership.status)}`}>
                      {membership.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">Created by: {membership.created_by_name || `User #${membership.created_by}`}</p>
                    <p className="text-xs text-gray-500">{new Date(membership.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">Start Date</p>
                    <p className="font-medium">{new Date(membership.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Date</p>
                    <p className="font-medium">{new Date(membership.end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Batch Time</p>
                    <p className="font-medium">{membership.batch_time}</p>
                  </div>
                  {membership.trainer_assigned && (
                    <div>
                      <p className="text-gray-500">Trainer</p>
                      <p className="font-medium">{membership.trainer_assigned}</p>
                    </div>
                  )}
                  {membership.locker_required && (
                    <div>
                      <p className="text-gray-500">Locker</p>
                      <p className="font-medium">Required</p>
                    </div>
                  )}
                  {membership.reference_of_admission && (
                    <div>
                      <p className="text-gray-500">Reference</p>
                      <p className="font-medium">{membership.reference_of_admission}</p>
                    </div>
                  )}
                  {membership.membership_types && membership.membership_types.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Membership Types</p>
                      <p className="font-medium">{membership.membership_types.join(', ')}</p>
                    </div>
                  )}
                </div>
                
                {/* Payment Summary and Transactions */}
                {(getPaymentsForMembership(membership.id).length > 0 || getTransactionsForMembership(membership.id).length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Payment Details</h5>
                    
                    {/* Payment Summary */}
                    {getPaymentsForMembership(membership.id).map((payment) => (
                      <div key={payment.id} className="bg-white/50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Total Amount</p>
                            <p className="font-semibold text-gray-900">₹{payment.total_amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Paid Amount</p>
                            <p className="font-semibold text-green-700">₹{payment.paid_amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(payment.payment_status)}`}>
                              {payment.payment_status}
                            </span>
                          </div>
                          <div>
                            <p className="text-gray-500">Next Due</p>
                            <p className="font-medium text-gray-900">
                              {payment.next_due_date ? new Date(payment.next_due_date).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Transaction History */}
                    {getTransactionsForMembership(membership.id).length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-xs font-semibold text-gray-700 mb-2">Transaction History</h6>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-white/50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Amount</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Mode</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Receipt</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {getTransactionsForMembership(membership.id).map((transaction) => (
                                <tr key={transaction.id} className="bg-white/30">
                                  <td className="px-3 py-2">{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 capitalize">{transaction.transaction_type.replace(/_/g, ' ')}</td>
                                  <td className="px-3 py-2 font-medium text-green-700">₹{transaction.amount}</td>
                                  <td className="px-3 py-2">{transaction.payment_mode}</td>
                                  <td className="px-3 py-2 text-xs">{transaction.receipt_number || 'N/A'}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(transaction.payment_status)}`}>
                                      {transaction.payment_status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberProfilePage;
