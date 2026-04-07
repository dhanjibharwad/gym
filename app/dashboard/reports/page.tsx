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
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';
import Toast from '@/app/components/Toast';
import { cachedFetch, clientCacheGet, clientCacheSet } from '@/lib/clientCache';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Data states
  const [membershipData, setMembershipData] = useState<{ memberships: Membership[], summary: any }>({ memberships: [], summary: null });
  const [paymentData, setPaymentData] = useState<{ payments: Payment[], summary: any, mode_breakdown: any[] }>({ payments: [], summary: null, mode_breakdown: [] });
  const [revenueData, setRevenueData] = useState<RevenueData>({ daily_revenue: [], summary: null, top_members: [], plan_breakdown: [] });
  const [overallData, setOverallData] = useState<OverallReport>({ overview: null, recent_activities: [], status_distribution: [], plan_popularity: [] });
  
  // Search states
  const [membershipSearch, setMembershipSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    let queryParams = `period=${dateFilter}`;
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const startDateObj = new Date(customStartDate);
      const endDateObj = new Date(customEndDate);
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) return;
      if (endDateObj < startDateObj) { showToast('End date must be after start date', 'error'); return; }
      queryParams = `start_date=${customStartDate}&end_date=${customEndDate}`;
    }

    const urlMap: Record<string, string> = {
      memberships: `/api/reports/membership?${queryParams}`,
      payments:    `/api/reports/payment?${queryParams}`,
      revenue:     `/api/reports/revenue?${queryParams}`,
      overall:     `/api/reports/overall?${queryParams}`,
    };
    const url = urlMap[activeTab];
    if (!url) return;

    // Show cached data instantly
    const cached = clientCacheGet<any>(url);
    if (cached?.success) {
      applyData(activeTab, cached);
      // Refresh in background silently
      fetch(url).then(r => r.json()).then(fresh => {
        if (fresh?.success) { clientCacheSet(url, fresh); applyData(activeTab, fresh); }
      }).catch(() => {});
      return;
    }

    setLoading(true);
    try {
      const data = await cachedFetch<any>(url);
      if (data?.success) applyData(activeTab, data);
    } catch {
      showToast('Failed to fetch report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyData = (tab: string, data: any) => {
    if (tab === 'memberships') setMembershipData(data);
    else if (tab === 'payments') setPaymentData(data);
    else if (tab === 'revenue') setRevenueData(data);
    else if (tab === 'overall') setOverallData(data);
  };

  // Export to Excel
  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    let data: any[] = [];
    let fileName = `reports-${activeTab}-${new Date().toISOString().split('T')[0]}`;

    switch (activeTab) {
      case 'memberships':
        data = membershipData.memberships.map(m => ({
          'Member Name': m.full_name, 'Phone': m.phone_number, 'Email': m.email,
          'Plan': m.plan_name, 'Price': m.price, 'Start Date': m.start_date,
          'End Date': m.end_date, 'Status': m.status_label,
          'Total Amount': m.total_amount, 'Paid Amount': m.paid_amount, 'Payment Status': m.payment_status
        }));
        fileName = `membership-reports-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'payments':
        data = paymentData.payments.map(p => ({
          'Member Name': p.full_name, 'Phone': p.phone_number, 'Plan': p.plan_name,
          'Transaction Type': p.transaction_type_label, 'Amount': p.amount,
          'Payment Mode': p.payment_mode, 'Transaction Date': p.transaction_date,
          'Receipt Number': p.receipt_number, 'Created By': p.created_by
        }));
        fileName = `payment-reports-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'revenue':
        data = revenueData.daily_revenue.map(r => ({
          'Date': r.date, 'Transactions': r.transaction_count,
          'Total Revenue': r.daily_income, 'Refunds': r.daily_refunds
        }));
        fileName = `revenue-reports-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'overall':
        showToast('Overall dashboard cannot be exported. Select a specific report tab.', 'info');
        return;
    }

    if (data.length === 0) { showToast('No data available to export', 'info'); return; }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    showToast('Excel file exported successfully', 'success');
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (activeTab === 'overall') {
      showToast('Select Memberships, Payments, or Revenue tab to export PDF.', 'info');
      return;
    }

    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const dateRange = dateFilter === 'custom'
      ? `${customStartDate} to ${customEndDate}`
      : dateFilters.find(f => f.value === dateFilter)?.label || '';

    const ORANGE = [234, 88, 12] as [number, number, number];
    const DARK   = [31, 41, 55]  as [number, number, number];
    const LIGHT  = [249, 250, 251] as [number, number, number];
    const WHITE  = [255, 255, 255] as [number, number, number];
    const GRAY   = [107, 114, 128] as [number, number, number];
    const GREEN  = [22, 163, 74]  as [number, number, number];
    const RED    = [220, 38, 38]  as [number, number, number];
    const BLUE   = [37, 99, 235]  as [number, number, number];

    const addHeader = (title: string) => {
      // Orange top bar
      doc.setFillColor(...ORANGE);
      doc.rect(0, 0, pageW, 18, 'F');
      // Gym name
      doc.setTextColor(...WHITE);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('OUR GYM', 14, 12);
      // Report title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(title, pageW / 2, 12, { align: 'center' });
      // Date
      doc.setFontSize(9);
      doc.text(`Generated: ${today}`, pageW - 14, 12, { align: 'right' });
      // Period bar
      doc.setFillColor(...DARK);
      doc.rect(0, 18, pageW, 8, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${dateRange}`, 14, 23.5);
    };

    const addFooter = () => {
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...LIGHT);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.line(0, pageH - 10, pageW, pageH - 10);
        doc.setTextColor(...GRAY);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Our Gym Management System', 14, pageH - 4);
        doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 4, { align: 'center' });
        doc.text(`Confidential`, pageW - 14, pageH - 4, { align: 'right' });
      }
    };

    const drawSummaryCards = (cards: { label: string; value: string; color: [number,number,number] }[], startY: number) => {
      const cardW = (pageW - 28 - (cards.length - 1) * 5) / cards.length;
      cards.forEach((card, i) => {
        const x = 14 + i * (cardW + 5);
        doc.setFillColor(...WHITE);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(x, startY, cardW, 20, 2, 2, 'FD');
        // Color accent bar
        doc.setFillColor(...card.color);
        doc.roundedRect(x, startY, 3, 20, 1, 1, 'F');
        doc.setTextColor(...GRAY);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(card.label, x + 7, startY + 7);
        doc.setTextColor(...DARK);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(card.value, x + 7, startY + 15);
      });
      return startY + 26;
    };

    // ── MEMBERSHIPS ──────────────────────────────────────────────────────────
    if (activeTab === 'memberships') {
      if (membershipData.memberships.length === 0) { showToast('No membership data to export', 'info'); return; }
      addHeader('Membership Report');
      let y = 32;

      if (membershipData.summary) {
        const s = membershipData.summary;
        y = drawSummaryCards([
          { label: 'Total Memberships', value: String(s.total_memberships || 0), color: BLUE },
          { label: 'Active',            value: String(s.active_memberships || 0),  color: GREEN },
          { label: 'Expired',           value: String(s.expired_memberships || 0), color: RED },
          { label: 'Total Revenue',     value: `Rs.${Number(s.collected_revenue || 0).toFixed(0)}`, color: ORANGE },
        ], y);
      }

      autoTable(doc, {
        startY: y,
        head: [['#', 'Member Name', 'Phone', 'Plan', 'Duration', 'Total', 'Paid', 'Status', 'Start', 'End']],
        body: membershipData.memberships.map((m, i) => [
          i + 1,
          m.full_name,
          m.phone_number,
          m.plan_name,
          `${m.duration_months}m`,
          `Rs.${Number(m.total_amount || 0).toFixed(0)}`,
          `Rs.${Number(m.paid_amount || 0).toFixed(0)}`,
          m.status_label,
          m.start_date ? new Date(m.start_date).toLocaleDateString('en-IN') : '-',
          m.end_date   ? new Date(m.end_date).toLocaleDateString('en-IN')   : '-',
        ]),
        styles: { fontSize: 7.5, cellPadding: 3, textColor: DARK, lineColor: [229, 231, 235], lineWidth: 0.1 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'center' },
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 7) {
            const status = membershipData.memberships[data.row.index]?.status;
            const color = status === 'active' ? GREEN : status === 'expired' ? RED : GRAY;
            doc.setTextColor(...color);
            doc.setFont('helvetica', 'bold');
            doc.text(String(data.cell.text), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
            doc.setTextColor(...DARK);
            doc.setFont('helvetica', 'normal');
            return false;
          }
        },
        margin: { left: 14, right: 14, bottom: 14 },
      });
    }

    // ── PAYMENTS ─────────────────────────────────────────────────────────────
    else if (activeTab === 'payments') {
      if (paymentData.payments.length === 0) { showToast('No payment data to export', 'info'); return; }
      addHeader('Payment History Report');
      let y = 32;

      if (paymentData.summary) {
        const s = paymentData.summary;
        const cards: { label: string; value: string; color: [number,number,number] }[] = [
          { label: 'Total Transactions', value: String(s.total_transactions || 0), color: BLUE },
          { label: 'Total Revenue',      value: `Rs.${Number(s.total_income || 0).toFixed(0)}`, color: GREEN },
          { label: 'Pending Amount',     value: `Rs.${Number(s.pending_amount || 0).toFixed(0)}`, color: [245, 158, 11] as [number,number,number] },
        ];
        if (paymentData.mode_breakdown?.length) {
          cards.push({ label: 'Payment Modes', value: String(paymentData.mode_breakdown.length), color: ORANGE });
        }
        y = drawSummaryCards(cards, y);
      }

      // Mode breakdown mini-table
      if (paymentData.mode_breakdown?.length) {
        doc.setTextColor(...DARK);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Mode Breakdown', 14, y + 4);
        autoTable(doc, {
          startY: y + 7,
          head: [['Payment Mode', 'Transactions', 'Total Amount']],
          body: paymentData.mode_breakdown.map(m => [
            m.payment_mode,
            m.transaction_count,
            `Rs.${Number(m.total_amount || 0).toFixed(2)}`,
          ]),
          styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK },
          headStyles: { fillColor: ORANGE, textColor: WHITE, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: LIGHT },
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
          margin: { left: 14, right: pageW / 2 },
          tableWidth: (pageW - 28) / 2,
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      autoTable(doc, {
        startY: y,
        head: [['#', 'Member', 'Phone', 'Plan', 'Type', 'Amount', 'Mode', 'Date', 'Receipt No.']],
        body: paymentData.payments.map((p, i) => [
          i + 1,
          p.full_name,
          p.phone_number,
          p.plan_name,
          p.transaction_type_label,
          `Rs.${Number(p.amount || 0).toFixed(2)}`,
          p.payment_mode,
          p.transaction_date ? new Date(p.transaction_date).toLocaleDateString('en-IN') : '-',
          p.receipt_number || '-',
        ]),
        styles: { fontSize: 7.5, cellPadding: 3, textColor: DARK, lineColor: [229, 231, 235], lineWidth: 0.1 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'center' },
        },
        margin: { left: 14, right: 14, bottom: 14 },
      });
    }

    // ── REVENUE ──────────────────────────────────────────────────────────────
    else if (activeTab === 'revenue') {
      if (!revenueData.summary && revenueData.daily_revenue.length === 0) { showToast('No revenue data to export', 'info'); return; }
      addHeader('Revenue Analytics Report');
      let y = 32;

      if (revenueData.summary) {
        const s = revenueData.summary;
        y = drawSummaryCards([
          { label: 'Total Revenue',     value: `Rs.${Number(s.total_revenue || 0).toFixed(0)}`,  color: GREEN },
          { label: 'Total Transactions',value: String(s.total_transactions || 0),                color: BLUE },
          { label: 'Unique Customers',  value: String(s.unique_customers || 0),                  color: ORANGE },
          { label: 'Active Days',       value: String(s.active_days || 0),                       color: DARK },
        ], y);
      }

      if (revenueData.daily_revenue.length > 0) {
        doc.setTextColor(...DARK);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Revenue Breakdown', 14, y + 4);
        autoTable(doc, {
          startY: y + 7,
          head: [['Date', 'Transactions', 'Revenue (Rs.)', 'Refunds (Rs.)', 'Net (Rs.)']],
          body: revenueData.daily_revenue.map(r => [
            r.date ? new Date(r.date).toLocaleDateString('en-IN') : '-',
            r.transaction_count,
            Number(r.daily_income || 0).toFixed(2),
            Number(r.daily_refunds || 0).toFixed(2),
            Number(r.net_daily_amount || 0).toFixed(2),
          ]),
          styles: { fontSize: 7.5, cellPadding: 3, textColor: DARK, lineColor: [229, 231, 235], lineWidth: 0.1 },
          headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: LIGHT },
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
          },
          margin: { left: 14, right: 14, bottom: 14 },
        });
      }
    }

    addFooter();
    const fileName = `${activeTab}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    showToast('PDF exported successfully', 'success');
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

  const filteredPayments = paymentData.payments?.filter(p => 
    p.full_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.phone_number?.includes(paymentSearch) ||
    p.plan_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.receipt_number?.toLowerCase().includes(paymentSearch.toLowerCase())
  ) || [];

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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        
        {(activeTab === 'memberships' || activeTab === 'payments' || activeTab === 'revenue') && (
          <div className="flex flex-wrap gap-3">
            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent text-gray-800"
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
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
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
                    className="w-full pl-10 pr-4 py-2 placeholder-slate-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
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
                    placeholder="Search payments by name, phone, transcation number..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 placeholder-slate-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-800"
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference No.</th>
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