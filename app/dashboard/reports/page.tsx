'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  CreditCard, 
  IndianRupee, 
  Calendar, 
  Filter, 
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Activity,
  MoreHorizontal,
  Search,
  ChevronDown,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';

interface Membership {
  id: number;
  member_id: number;
  full_name: string;
  phone_number: string;
  email: string;
  profile_photo_url: string;
  plan_name: string;
  duration_months: number;
  price: number;
  start_date: string;
  end_date: string;
  status: string;
  status_label: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_mode: string;
}

interface Payment {
  id: number;
  member_id: number;
  membership_id: number;
  transaction_type: string;
  transaction_type_label: string;
  amount: number;
  payment_mode: string;
  transaction_date: string;
  receipt_number: string;
  created_by: string;
  created_at: string;
  full_name: string;
  phone_number: string;
  profile_photo_url: string;
  plan_name: string;
  membership_status: string;
  total_amount: number;  // Added from payments table
  paid_amount: number;   // Added from payments table
  payment_status: string; // Added from payments table
}

interface RevenueData {
  daily_revenue: {
    date: string;
    transaction_count: number;
    daily_income: number;
    daily_refunds: number;
    net_daily_amount: number;
  }[];
  summary: {
    total_transactions: number;
    total_revenue: number;
    total_refunds: number;
    net_revenue: number;
    unique_customers: number;
    active_days: number;
  } | null;
  top_members: {
    id: number;
    full_name: string;
    phone_number: string;
    profile_photo_url: string;
    transaction_count: number;
    total_spent: number;
  }[];
  plan_breakdown: {
    plan_name: string;
    price: number;
    membership_count: number;
    plan_revenue: number;
  }[];
}

interface OverallReport {
  overview: {
    total_memberships: number;
    active_memberships: number;
    expired_memberships: number;
    total_members: number;
    active_members: number;
    total_transactions: number;
    total_revenue: number;
    total_refunds: number;
    active_plans: number;
  } | null;
  recent_activities: {
    activity_type: string;
    id: number;
    full_name: string;
    plan_name: string;
    status: string;
    activity_date: string;
    description: string;
  }[];
  status_distribution: {
    status: string;
    status_label: string;
    count: number;
  }[];
  plan_popularity: {
    plan_name: string;
    price: number;
    membership_count: number;
    potential_revenue: number;
  }[];
}

const formatCurrency = (value: any): string => {
  const num = Number(value || 0);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

function ReportsPage() {
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState('overall');
  const [dateFilter, setDateFilter] = useState('month');
  const [showCustomFilter, setShowCustomFilter] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customDateApplied, setCustomDateApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [membershipData, setMembershipData] = useState<{ memberships: Membership[], summary: any }>({ memberships: [], summary: null });
  const [paymentData, setPaymentData] = useState<{ payments: Payment[], summary: any, mode_breakdown: any[] }>({ payments: [], summary: null, mode_breakdown: [] });
  const [revenueData, setRevenueData] = useState<RevenueData>({ daily_revenue: [], summary: null, top_members: [], plan_breakdown: [] });
  const [overallData, setOverallData] = useState<OverallReport>({ overview: null, recent_activities: [], status_distribution: [], plan_popularity: [] });
  
  // Search states
  const [membershipSearch, setMembershipSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');

  const tabs = [
    { id: 'overall', label: 'Overall Dashboard', icon: BarChart3 },
    { id: 'memberships', label: 'Membership Reports', icon: Users },
    { id: 'payments', label: 'Payment History', icon: CreditCard },
    { id: 'revenue', label: 'Revenue Analytics', icon: IndianRupee },
  ];

  const dateFilters = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: '15days', label: 'Last 15 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Fetch data based on active tab and filters
  const fetchData = async () => {
    setLoading(true);
    try {
      let queryParams = `period=${dateFilter}`;
      
      console.log('Fetching data with:', { dateFilter, customStartDate, customEndDate, activeTab });
      console.log('Current tab data lengths:', {
        memberships: membershipData.memberships.length,
        payments: paymentData.payments.length,
        revenue: revenueData.daily_revenue.length
      });
      
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        // Validate date format
        const startDateObj = new Date(customStartDate);
        const endDateObj = new Date(customEndDate);
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          console.error('Invalid date format:', { customStartDate, customEndDate });
          setLoading(false);
          return;
        }
        
        // Check if end date is after start date
        if (endDateObj < startDateObj) {
          console.error('End date cannot be before start date:', { customStartDate, customEndDate });
          alert('End date must be after start date');
          setLoading(false);
          return;
        }
        
        queryParams = `start_date=${customStartDate}&end_date=${customEndDate}`;
        console.log('Using custom date range:', queryParams);
        console.log('Date objects:', { startDateObj, endDateObj });
      } else {
        console.log('Using period filter:', queryParams);
      }

      let url = '';
      switch (activeTab) {
        case 'memberships':
          url = `/api/reports/membership?${queryParams}`;
          console.log('Fetching memberships from:', url);
          const companyId1 = localStorage.getItem('company_id') || '1';
          const membershipRes = await fetch(url, {
            headers: {
              'x-company-id': companyId1
            }
          });
          const membershipData = await membershipRes.json();
          console.log('Memberships API response:', membershipData);
          if (membershipData.success) {
            console.log('Setting membership data with', membershipData.memberships.length, 'records');
            setMembershipData(membershipData);
          }
          break;
        case 'payments':
          url = `/api/reports/payment?${queryParams}`;
          console.log('Fetching payments from:', url);
          
          // Get company ID from localStorage or session
          const companyId4 = localStorage.getItem('company_id') || '1';
          console.log('Using company ID:', companyId4);
          
          const paymentRes = await fetch(url, {
            headers: {
              'x-company-id': companyId4
            }
          });
          const paymentData = await paymentRes.json();
          console.log('Payments API response:', paymentData);
          if (paymentData.success) {
            console.log('Setting payment data with', paymentData.payments?.length || 0, 'records');
            console.log('Payment summary:', paymentData.summary);
            console.log('Payment mode breakdown:', paymentData.mode_breakdown);
            setPaymentData(paymentData);
          } else {
            console.error('Payment API error:', paymentData.message, paymentData.error);
          }
          break;
        case 'revenue':
          url = `/api/reports/revenue?${queryParams}`;
          const companyId2 = localStorage.getItem('company_id') || '1';
          const revenueRes = await fetch(url, {
            headers: {
              'x-company-id': companyId2
            }
          });
          const revenueData = await revenueRes.json();
          if (revenueData.success) {
            setRevenueData(revenueData);
          }
          break;
        case 'overall':
          url = `/api/reports/overall?${queryParams}`;
          const companyId3 = localStorage.getItem('company_id') || '1';
          const overallRes = await fetch(url, {
            headers: {
              'x-company-id': companyId3
            }
          });
          const overallData = await overallRes.json();
          if (overallData.success) {
            setOverallData(overallData);
          }
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    console.log('Exporting to Excel for tab:', activeTab);
    console.log('Current data state:', { 
      memberships: membershipData.memberships?.length || 0,
      payments: paymentData.payments?.length || 0,
      revenue: revenueData.daily_revenue?.length || 0
    });
    
    let data: any[] = [];
    let fileName = `reports-${activeTab}-${new Date().toISOString().split('T')[0]}`;

    switch (activeTab) {
      case 'memberships':
        console.log('Exporting membership data:', membershipData.memberships?.slice(0, 2));
        data = membershipData.memberships.map(m => ({
          'Member Name': m.full_name,
          'Phone': m.phone_number,
          'Email': m.email,
          'Plan': m.plan_name,
          'Price': m.price,
          'Start Date': m.start_date,
          'End Date': m.end_date,
          'Status': m.status_label,
          'Total Amount': m.total_amount,
          'Paid Amount': m.paid_amount,
          'Payment Status': m.payment_status
        }));
        fileName = `membership-reports-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'payments':
        console.log('Exporting payment data:', paymentData.payments?.slice(0, 2));
        data = paymentData.payments.map(p => ({
          'Member Name': p.full_name,
          'Phone': p.phone_number,
          'Plan': p.plan_name,
          'Transaction Type': p.transaction_type_label,
          'Amount': p.amount,
          'Payment Mode': p.payment_mode,
          'Transaction Date': p.transaction_date,
          'Receipt Number': p.receipt_number,
          'Created By': p.created_by
        }));
        fileName = `payment-reports-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'revenue':
        console.log('Exporting revenue data:', revenueData.daily_revenue?.slice(0, 2));
        data = revenueData.daily_revenue.map(r => ({
          'Date': r.date,
          'Transactions': r.transaction_count,
          'Total Revenue': r.daily_income,
          'Refunds': r.daily_refunds,
          'Pending Count': r.transaction_count
        }));
        fileName = `revenue-reports-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'overall':
        // Overall dashboard doesn't have detailed data to export
        alert('Overall dashboard summary cannot be exported. Please select a specific report tab.');
        return;
    }

    if (data.length === 0) {
      alert('No data available to export for the current selection.');
      return;
    }

    console.log('Exporting data:', data.slice(0, 2));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    console.log('Exporting to PDF for tab:', activeTab);
    console.log('Current data state:', { 
      memberships: membershipData.summary,
      payments: paymentData.summary,
      revenue: revenueData.summary
    });
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report`, 14, 20);
      
    // Add date range
    doc.setFontSize(12);
    const dateRange = dateFilter === 'custom' 
      ? `${customStartDate} to ${customEndDate}`
      : dateFilters.find(f => f.value === dateFilter)?.label || '';
    doc.text(`Period: ${dateRange}`, 14, 30);

    // Add summary data
    let yPos = 40;
    doc.setFontSize(14);
    doc.text('Summary', 14, yPos);
    yPos += 10;

    switch (activeTab) {
      case 'memberships':
        if (membershipData.summary) {
          const summary = membershipData.summary;
          doc.setFontSize(10);
          doc.text(`Total Memberships: ${summary.total_memberships}`, 14, yPos);
          doc.text(`Active: ${summary.active_memberships}`, 14, yPos + 6);
          doc.text(`Expired: ${summary.expired_memberships}`, 14, yPos + 12);
          doc.text(`Cancelled: ${summary.cancelled_memberships}`, 14, yPos + 18);
          doc.text(`Total Revenue: ₹${Number(summary.collected_revenue || 0).toFixed(2)}`, 14, yPos + 24);
        } else {
          doc.setFontSize(10);
          doc.text('No membership summary data available', 14, yPos);
        }
        break;
      case 'payments':
        if (paymentData.summary) {
          const summary = paymentData.summary;
          doc.setFontSize(10);
          doc.text(`Total Transactions: ${summary.total_transactions}`, 14, yPos);
          doc.text(`Total Revenue: ₹${Number(summary.total_income || 0).toFixed(2)}`, 14, yPos + 6);
          doc.text(`Pending Amount: ₹${Number(summary.pending_amount || 0).toFixed(2)}`, 14, yPos + 12);
        } else {
          doc.setFontSize(10);
          doc.text('No payment summary data available', 14, yPos);
        }
        break;
      case 'revenue':
        if (revenueData.summary) {
          const summary = revenueData.summary;
          doc.setFontSize(10);
          doc.text(`Total Revenue: ₹${Number(summary.total_revenue || 0).toFixed(2)}`, 14, yPos);
          doc.text(`Total Transactions: ${summary.total_transactions}`, 14, yPos + 6);
        } else {
          doc.setFontSize(10);
          doc.text('No revenue summary data available', 14, yPos);
        }
        break;
      case 'overall':
        doc.setFontSize(10);
        doc.text('Overall dashboard summary cannot be exported to PDF. Please select a specific report tab.', 14, yPos);
        break;
    }

    const fileName = `reports-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('Saving PDF:', fileName);
    doc.save(fileName);
  };

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    console.log('Date filter changed to:', value);
    setDateFilter(value);
    setCustomDateApplied(false); // Reset applied state when changing filter type
    if (value !== 'custom') {
      console.log('Hiding custom filter and clearing dates');
      setShowCustomFilter(false);
      setCustomStartDate('');
      setCustomEndDate('');
    } else {
      console.log('Showing custom filter');
      setShowCustomFilter(true);
    }
  };

  // Filtered data
  const filteredMemberships = membershipData.memberships.filter(m => 
    m.full_name.toLowerCase().includes(membershipSearch.toLowerCase()) ||
    m.phone_number.includes(membershipSearch) ||
    m.plan_name.toLowerCase().includes(membershipSearch.toLowerCase())
  );

  console.log('Payment data:', paymentData);
  console.log('Payment search:', paymentSearch);
  console.log('Raw payments:', paymentData.payments);
  
  const filteredPayments = paymentData.payments?.filter(p => 
    p.full_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.phone_number?.includes(paymentSearch) ||
    p.plan_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.receipt_number?.toLowerCase().includes(paymentSearch.toLowerCase())
  ) || [];
  
  console.log('Filtered payments:', filteredPayments);

  // Fetch data on tab or filter change
  useEffect(() => {
    // For custom dates, only fetch when dates are applied
    if (dateFilter === 'custom') {
      if (customDateApplied && customStartDate && customEndDate) {
        fetchData();
      }
    } else {
      // For predefined periods, fetch immediately
      fetchData();
    }
  }, [activeTab, dateFilter, customDateApplied, customStartDate, customEndDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        
        {(activeTab === 'memberships' || activeTab === 'payments') && (
          <div className="flex flex-wrap gap-3">
            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {dateFilters.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Custom Date Range */}
            {showCustomFilter && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    console.log('Start date changed to:', e.target.value);
                    setCustomStartDate(e.target.value);
                    setCustomDateApplied(false);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    console.log('End date changed to:', e.target.value);
                    setCustomEndDate(e.target.value);
                    setCustomDateApplied(false);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setCustomDateApplied(true);
                      // This will trigger the useEffect to fetch data
                    }
                  }}
                  disabled={!customStartDate || !customEndDate}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    customDateApplied 
                      ? 'bg-green-100 text-green-700 cursor-default' 
                      : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
                  }`}
                >
                  {customDateApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
            )}
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              {can('export_reports') && (
                <>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <div className="space-y-6">
          {/* Overall Dashboard */}
          {activeTab === 'overall' && overallData.overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{overallData.overview.total_members}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Memberships</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{overallData.overview.active_memberships}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">₹{formatCurrency(overallData.overview.total_revenue)}</p>
                  </div>
                  <IndianRupee className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Plans</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{overallData.overview.active_plans}</p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Membership Reports */}
          {activeTab === 'memberships' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {membershipData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Total Memberships</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{membershipData.summary.total_memberships}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{membershipData.summary.active_memberships}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{membershipData.summary.expired_memberships}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">₹{formatCurrency(membershipData.summary.collected_revenue)}</p>
                  </div>
                </div>
              )}
              
              {/* Search */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search memberships by name, phone, or plan..."
                    value={membershipSearch}
                    onChange={(e) => setMembershipSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              
              {/* Memberships Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMemberships.map((membership) => (
                        <tr key={membership.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {membership.profile_photo_url ? (
                                  <img className="h-10 w-10 rounded-full object-cover" src={membership.profile_photo_url} alt={membership.full_name} />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                                    <span className="text-sm font-medium text-white">
                                      {membership.full_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{membership.full_name}</div>
                                <div className="text-sm text-gray-500">{membership.phone_number}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{membership.plan_name}</div>
                            <div className="text-sm text-gray-500">₹{membership.price}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {membership.duration_months} months
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">₹{membership.total_amount}</div>
                            <div className="text-sm text-gray-500">Paid: ₹{membership.paid_amount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              membership.status === 'active' ? 'bg-green-100 text-green-800' :
                              membership.status === 'expired' ? 'bg-red-100 text-red-800' :
                              membership.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {membership.status_label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(membership.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Payment Reports */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Payment Summary */}
              {paymentData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{paymentData.summary.total_transactions}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">₹{formatCurrency(paymentData.summary.total_income)}</p>
                    <p className="text-xs text-gray-500 mt-1">{paymentData.mode_breakdown?.length || 0} payment modes</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">₹{formatCurrency(paymentData.summary.pending_amount)}</p>
                  </div>
                </div>
              )}
              
              {/* Payment Status Breakdown */}
              {paymentData.mode_breakdown && paymentData.mode_breakdown.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Mode Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentData.mode_breakdown.map((mode, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{mode.payment_mode}</p>
                            <p className="text-sm text-gray-600">{mode.transaction_count} transactions</p>
                          </div>
                          <p className="text-lg font-bold text-gray-900">₹{formatCurrency(mode.total_amount)}</p>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: `${(mode.total_amount / (paymentData.summary?.total_income || 1)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search payments by name, phone, receipt..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              
              {/* Payments Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="overflow-x-auto">
                  {filteredPayments.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
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
                                      <span className="text-sm font-medium text-white">
                                        {payment.full_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{payment.full_name}</div>
                                  <div className="text-sm text-gray-500">{payment.phone_number}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.plan_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {payment.transaction_type_label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ₹{payment.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {payment.payment_mode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(payment.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {payment.receipt_number || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No payment records found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {paymentSearch ? 'Try adjusting your search.' : 'No payment history available for the selected period.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Revenue Analytics */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Revenue Summary */}
              {revenueData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">₹{formatCurrency(revenueData.summary.total_revenue)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{revenueData.summary.total_transactions}</p>
                  </div>
                </div>
              )}


            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Wrap with PageGuard to check permissions
export default function ReportsPageWithGuard() {
  return (
    <PageGuard permission="view_reports">
      <ReportsPage />
    </PageGuard>
  );
}