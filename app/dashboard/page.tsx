'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  CreditCard,
  Calendar,
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  IndianRupee,
  Target,
  UserCog,
  History,
  Filter,
  X,
  Cake
} from 'lucide-react';
import { usePermission } from '@/components/rbac/PermissionGate';
import GymLoader from '@/components/GymLoader';

interface User {
  id: number;
  name: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
}

interface Member {
  id: number;
  full_name: string;
  membership_status: string;
  created_at: string;
  end_date: string;
  plan_name: string;
  profile_photo_url?: string;
  date_of_birth?: string;
}

interface Payment {
  id: number;
  paid_amount: number | string;
  payment_status: string;
  created_at: string;
}

interface RecentMember {
  id: number;
  name: string;
  plan: string;
  joinDate: string;
  status: string;
  profilePhoto?: string;
}

interface ExpiringMember {
  id: number;
  name: string;
  plan: string;
  expiryDate: string;
  daysLeft: number;
  profilePhoto?: string;
}

interface UpcomingBirthday {
  id: number;
  name: string;
  birthdayDate: string;
  age: number;
  daysUntil: number;
  profilePhoto?: string;
}

const Dashboard = () => {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const [currentTime, setCurrentTime] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState({
    totalMembers: 0,
    newMembersToday: 0,
    expiringThisWeek: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentMembers: [] as RecentMember[],
    expiringMembers: [] as ExpiringMember[],
    upcomingBirthdays: [] as UpcomingBirthday[]
  });
  const [loading, setLoading] = useState(true);
  
  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  
  // Birthday filter state
  const [birthdayFilter, setBirthdayFilter] = useState<7 | 15 | 30>(30);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString());
    fetchUserData();
    fetchDashboardData();
  }, []);

  // Recalculate when birthday filter changes
  useEffect(() => {
    if (allMembers.length > 0) {
      calculateDashboardData(allMembers, allPayments);
    }
  }, [birthdayFilter]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.push('/auth/login');
    }
  };

  const calculateDashboardData = (members: Member[], payments: Payment[], filterStartDate?: string, filterEndDate?: string) => {
    const hasDateFilter = filterStartDate && filterEndDate;
    
    // Filter members by date range if filter is applied
    const filteredMembers = hasDateFilter 
      ? members.filter((m: Member) => {
          const memberDate = new Date(m.created_at).toISOString().split('T')[0];
          return memberDate >= filterStartDate! && memberDate <= filterEndDate!;
        })
      : members;
    
    // Filter payments by date range if filter is applied
    const filteredPayments = hasDateFilter
      ? payments.filter((p: Payment) => {
          const paymentDate = new Date(p.created_at).toISOString().split('T')[0];
          return paymentDate >= filterStartDate! && paymentDate <= filterEndDate!;
        })
      : payments;
    
    // Calculate stats
    const totalMembers = members.length;
    
    // New members today (or in date range)
    const today = new Date().toISOString().split('T')[0];
    const newMembersToday = hasDateFilter 
      ? filteredMembers.length
      : members.filter((m: Member) => 
          new Date(m.created_at).toISOString().split('T')[0] === today
        ).length;
    
    // Expiring this week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const expiringThisWeek = members.filter((m: Member) => {
      if (!m.end_date) return false;
      const endDate = new Date(m.end_date);
      return endDate <= nextWeek && endDate >= new Date();
    }).length;
    
    // Revenue calculations
    const todayRevenue = hasDateFilter
      ? 0
      : payments
          .filter((p: Payment) => new Date(p.created_at).toISOString().split('T')[0] === today)
          .reduce((sum: number, p: Payment) => {
            const amount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(String(p.paid_amount)) || 0;
            return sum + amount;
          }, 0);
      
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRevenue = hasDateFilter
      ? 0
      : payments
          .filter((p: Payment) => {
            const paymentDate = new Date(p.created_at);
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, p: Payment) => {
            const amount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(String(p.paid_amount)) || 0;
            return sum + amount;
          }, 0);
    
    const totalRevenue = filteredPayments
      .reduce((sum: number, p: Payment) => {
        const amount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(String(p.paid_amount)) || 0;
        return sum + amount;
      }, 0);
    
    const pendingPayments = payments.filter((p: Payment) => 
      p.payment_status === 'pending' || p.payment_status === 'partial'
    ).length;
    
    // Recent members (filtered by date if filter applied)
    const recentMembers: RecentMember[] = filteredMembers
      .sort((a: Member, b: Member) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4)
      .map((m: Member) => ({
        id: m.id,
        name: m.full_name,
        plan: m.plan_name,
        joinDate: new Date(m.created_at).toLocaleDateString('en-GB').replace(/\//g, '-'),
        status: m.membership_status?.toLowerCase() === 'active' ? 'Active' : m.membership_status?.toLowerCase() === 'expired' ? 'Expired' : m.membership_status?.toLowerCase() === 'suspended' ? 'Suspended' : 'Inactive',
        profilePhoto: m.profile_photo_url
      }));
    
    // Expiring members
    const expiringMembers: ExpiringMember[] = members
      .filter((m: Member) => {
        if (!m.end_date) return false;
        const endDate = new Date(m.end_date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
      })
      .slice(0, 3)
      .map((m: Member) => {
        const endDate = new Date(m.end_date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: m.id,
          name: m.full_name,
          plan: m.plan_name,
          expiryDate: new Date(m.end_date).toLocaleDateString('en-GB').replace(/\//g, '-'),
          daysLeft,
          profilePhoto: m.profile_photo_url
        };
      });
    
    // Upcoming birthdays (next 30 days)
    const upcomingBirthdays: UpcomingBirthday[] = members
      .filter((m: Member) => m.date_of_birth)
      .map((m: Member) => {
        const today = new Date();
        const birthDate = new Date(m.date_of_birth!);
        const currentYear = today.getFullYear();
        
        // Set birthday to current year
        let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
        
        // If birthday already passed this year, set to next year
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
        }
        
        const diffTime = nextBirthday.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate age they will turn
        const age = nextBirthday.getFullYear() - birthDate.getFullYear();
        
        return {
          id: m.id,
          name: m.full_name,
          birthdayDate: nextBirthday.toLocaleDateString('en-GB').replace(/\//g, '-'),
          age,
          daysUntil,
          profilePhoto: m.profile_photo_url
        };
      })
      .filter((b: UpcomingBirthday) => b.daysUntil <= birthdayFilter)
      .sort((a: UpcomingBirthday, b: UpcomingBirthday) => a.daysUntil - b.daysUntil);
    
    setDashboardData({
      totalMembers,
      newMembersToday,
      expiringThisWeek,
      todayRevenue,
      monthlyRevenue,
      totalRevenue,
      pendingPayments,
      recentMembers,
      expiringMembers,
      upcomingBirthdays
    });
  };

  const fetchDashboardData = async () => {
    try {
      const [membersRes, paymentsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/payments')
      ]);
      
      const membersData = await membersRes.json();
      const paymentsData = await paymentsRes.json();
      
      if (membersData.success && paymentsData.success) {
        const members: Member[] = membersData.members;
        const payments: Payment[] = paymentsData.payments;
        
        setAllMembers(members);
        setAllPayments(payments);
        
        calculateDashboardData(members, payments);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (startDate && endDate) {
      calculateDashboardData(allMembers, allPayments, startDate, endDate);
      setShowDateFilter(false);
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    calculateDashboardData(allMembers, allPayments);
    setShowDateFilter(false);
  };

  const quickActions = [
    {
      label: 'Add Member',
      href: '/dashboard/add-members',
      icon: UserPlus,
      permission: 'add_members',
      color: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    },
    {
      label: 'Process Payment',
      href: '/dashboard/payments',
      icon: CreditCard,
      permission: 'manage_payments',
      color: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
    },
    {
      label: 'View Members',
      href: '/dashboard/members',
      icon: Users,
      permission: 'view_members',
      color: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
    },
    {
      label: 'Staff Management',
      href: '/dashboard/ourstaff',
      icon: UserCog,
      permission: 'manage_staff',
      color: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
    }
  ];

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <GymLoader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {user.role.toLowerCase() === 'admin' ? 'Admin Dashboard' : 
               user.role.toLowerCase() === 'reception' ? 'Reception Dashboard' : 
               `${user.role} Dashboard`}
            </h1>
            <p className="text-gray-300 mt-2">
              Welcome back, {user.name}! Here's what's happening at your gym today.
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="text-sm text-gray-400 mb-2">
              {currentTime && `Last updated: ${currentTime}`}
            </div>
            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  startDate && endDate 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                {startDate && endDate ? `${startDate} to ${endDate}` : 'Filter by Date'}
              </button>
              
              {showDateFilter && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Date Range</h4>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={applyDateFilter}
                        disabled={!startDate || !endDate}
                        className="flex-1 px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Apply
                      </button>
                      {(startDate || endDate) && (
                        <button
                          onClick={clearDateFilter}
                          className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Members */}
        <div 
          onClick={() => router.push('/dashboard/members')}
          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalMembers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 flex items-center mt-2">
                <TrendingUp className="w-3 h-3 mr-1" />
                All registered members
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Today's Revenue - Only show if has permission */}
        {can('view_revenue') && (
          <div 
            onClick={() => router.push('/dashboard/payments')}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                <p className="text-3xl font-bold text-gray-900">₹{Math.round(dashboardData.todayRevenue).toLocaleString()}</p>
                <p className="text-xs text-gray-500 flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Today's earnings
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                <IndianRupee className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Total Revenue - Admin only */}
        {user.role.toLowerCase() === 'admin' && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">₹{Math.round(dashboardData.totalRevenue).toLocaleString()}</p>
                <p className="text-xs text-gray-500 flex items-center mt-2">
                  <Target className="w-3 h-3 mr-1" />
                  All time earnings
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Expiring Soon */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring This Week</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.expiringThisWeek}</p>
              <p className="text-xs text-amber-600 flex items-center mt-2">
                <AlertCircle className="w-3 h-3 mr-1" />
                Needs attention
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => router.push('/dashboard/members')}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-md">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">New Today</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.newMembersToday}</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => router.push('/dashboard/payments')}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-md">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingPayments}</p>
            </div>
          </div>
        </div>

        {can('view_revenue') && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-md">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{Math.round(dashboardData.monthlyRevenue).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions
            .filter(action => can(action.permission))
            .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className={`flex items-center gap-3 p-4 bg-gradient-to-r ${action.color} text-white rounded-lg transition-all cursor-pointer`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                </button>
              );
            })
          }
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Members */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Members</h3>
              <button 
                onClick={() => router.push('/dashboard/members')}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors cursor-pointer">
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.recentMembers.length > 0 ? dashboardData.recentMembers.map((member, index) => (
                <div key={`recent-${member.id}-${index}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {member.profilePhoto ? (
                    <img
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                      src={member.profilePhoto}
                      alt={member.name}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.plan} • {member.joinDate}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No recent members</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expiring Members */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expiring Soon</h3>
              <button 
                onClick={() => router.push('/dashboard/expired')}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.expiringMembers.length > 0 ? dashboardData.expiringMembers.map((member, index) => (
                <div key={`expiring-${member.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    {member.profilePhoto ? (
                      <img
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        src={member.profilePhoto}
                        alt={member.name}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.plan} • Expires {member.expiryDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.daysLeft <= 1 
                        ? 'bg-red-100 text-red-700' 
                        : member.daysLeft <= 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {member.daysLeft} day{member.daysLeft !== 1 ? 's' : ''} left
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No expiring memberships</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h3>
              </div>
              <select
                value={birthdayFilter}
                onChange={(e) => setBirthdayFilter(Number(e.target.value) as 7 | 15 | 30)}
                className="text-xs px-2 py-1 border border-pink-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              >
                <option value={7}>7 Days</option>
                <option value={15}>15 Days</option>
                <option value={30}>1 Month</option>
              </select>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {dashboardData.upcomingBirthdays.length > 0 ? dashboardData.upcomingBirthdays.map((birthday, index) => (
                <div key={`birthday-${birthday.id}-${index}`} className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                  <div className="flex items-center gap-3">
                    {birthday.profilePhoto ? (
                      <img
                        className="w-10 h-10 rounded-full object-cover border-2 border-pink-300"
                        src={birthday.profilePhoto}
                        alt={birthday.name}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {birthday.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{birthday.name}</p>
                      <p className="text-sm text-gray-600">Turning {birthday.age} • {birthday.birthdayDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      birthday.daysUntil === 0 
                        ? 'bg-pink-500 text-white animate-pulse' 
                        : birthday.daysUntil <= 3
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {birthday.daysUntil === 0 ? '🎉 Today!' : `${birthday.daysUntil} day${birthday.daysUntil !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500">
                  <Cake className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No upcoming birthdays</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;