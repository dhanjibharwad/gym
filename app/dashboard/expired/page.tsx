"use client"

import { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Calendar, CreditCard, User, Search } from 'lucide-react';

interface Member {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  profile_photo_url: string;
  plan_name: string;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  membership_status: string;
}

export default function ExpiredMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchExpiredMembers();
  }, []);

  const fetchExpiredMembers = async () => {
    try {
      const response = await fetch('/api/members');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success && Array.isArray(data.members)) {
        const currentDate = new Date();
        const expiredMembers = data.members.filter((member: any) => {
          const endDate = new Date(member.end_date);
          return endDate < currentDate || member.membership_status === 'expired';
        });
        setMembers(expiredMembers);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone_number.includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysExpired = (endDate: string) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = today.getTime() - end.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Expired Memberships</h1>
        </div>
        <p className="text-gray-600">Members whose membership plans have expired</p>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Total Expired Memberships</h3>
            <p className="text-3xl font-bold">{filteredMembers.length}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Expired Memberships Found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'No memberships have expired yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Profile Photo */}
                  <div className="relative">
                    {member.profile_photo_url ? (
                      <img
                        src={member.profile_photo_url}
                        alt={member.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-red-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Member Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.full_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{member.phone_number}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{member.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expiry Info */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      Expired {getDaysExpired(member.end_date)} days ago
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <CreditCard className="w-4 h-4" />
                      <span>₹{member.paid_amount?.toLocaleString('en-IN')} ({member.payment_mode})</span>
                    </div>
                    {member.start_date && member.end_date && (
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(member.start_date)} - {formatDate(member.end_date)}</span>
                      </div>
                    )}
                    <div className="font-medium text-gray-900">
                      {member.plan_name} Plan
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}