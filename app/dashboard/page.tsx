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
  History
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  role: 'admin' | 'reception';
  permissions: string[];
}

interface Member {
  id: number;
  full_name: string;
  membership_status: string;
  created_at: string;
  end_date: string;
  plan_name: string;
  profile_photo_url?: string;
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

const Dashboard = () => {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newMembersToday: 0,
    expiringThisWeek: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentMembers: [] as RecentMember[],
    expiringMembers: [] as ExpiringMember[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString());
    fetchUserData();
    fetchDashboardData();
  }, []);

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

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return user.role.toLowerCase() === 'admin' || user.permissions.includes(permission);
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
        
        // Calculate stats
        const totalMembers = members.length;
        const activeMembers = members.filter((m: Member) => m.membership_status === 'active').length;
        
        // New members today
        const today = new Date().toISOString().split('T')[0];
        const newMembersToday = members.filter((m: Member) => 
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
        const todayRevenue = payments
          .filter((p: Payment) => new Date(p.created_at).toISOString().split('T')[0] === today)
          .reduce((sum: number, p: Payment) => {
            const amount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(String(p.paid_amount)) || 0;
            return sum + amount;
          }, 0);
          
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyRevenue = payments
          .filter((p: Payment) => {
            const paymentDate = new Date(p.created_at);
            return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, p: Payment) => {
            const amount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(String(p.paid_amount)) || 0;
            return sum + amount;
          }, 0);
        
        const totalRevenue = payments
          .reduce((sum: number, p: Payment) => {
            const amount = typeof p.paid_amount === 'number' ? p.paid_amount : parseFloat(String(p.paid_amount)) || 0;
            return sum + amount;
          }, 0);
        
        const pendingPayments = payments.filter((p: Payment) => 
          p.payment_status === 'pending' || p.payment_status === 'partial'
        ).length;
        
        // Recent members
        const recentMembers: RecentMember[] = members
          .sort((a: Member, b: Member) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4)
          .map((m: Member) => ({
            id: m.id,
            name: m.full_name,
            plan: m.plan_name,
            joinDate: new Date(m.created_at).toLocaleDateString('en-IN'),
            status: m.membership_status === 'active' ? 'Active' : 'Inactive',
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
              expiryDate: new Date(m.end_date).toLocaleDateString('en-IN'),
              daysLeft,
              profilePhoto: m.profile_photo_url
            };
          });
        
        setDashboardData({
          totalMembers,
          activeMembers,
          newMembersToday,
          expiringThisWeek,
          todayRevenue,
          monthlyRevenue,
          totalRevenue,
          pendingPayments,
          recentMembers,
          expiringMembers
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {user.role.toLowerCase() === 'admin' ? 'Admin Dashboard' : 'Reception Dashboard'}
            </h1>
            <p className="text-gray-300 mt-2">
              Welcome back, {user.name}! Here's what's happening at your gym today.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 text-sm text-gray-400">
            {currentTime && `Last updated: ${currentTime}`}
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Members */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalMembers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 flex items-center mt-2">
                <TrendingUp className="w-3 h-3 mr-1" />
                {dashboardData.totalMembers > 0 ? `${((dashboardData.activeMembers / dashboardData.totalMembers) * 100).toFixed(1)}% active` : 'No data'}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.activeMembers.toLocaleString()}</p>
              <p className="text-xs text-green-600 flex items-center mt-2">
                <CheckCircle className="w-3 h-3 mr-1" />
                {dashboardData.totalMembers > 0 ? `${((dashboardData.activeMembers / dashboardData.totalMembers) * 100).toFixed(1)}% active rate` : '0% active rate'}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Today's Revenue - Only show if has permission */}
        {hasPermission('view_revenue') && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
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
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all">
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-all">
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

        {hasPermission('view_revenue') && (
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
            .filter(action => hasPermission(action.permission))
            .map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className={`flex items-center gap-3 p-4 bg-gradient-to-r ${action.color} text-white rounded-lg transition-all`}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Members</h3>
              <button 
                onClick={() => router.push('/dashboard/members')}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.recentMembers.length > 0 ? dashboardData.recentMembers.map((member, index) => (
                <div key={`recent-${member.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {member.status}
                  </span>
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
      </div>
    </div>
  );
};

export default Dashboard;