'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Phone,
  Mail,
  User,
  Grid3X3,
  List,
  Edit,
  Save,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileUp,
  Archive,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Dumbbell,
  TrendingUp,
  Activity,
  CreditCard,
  History,
  ChevronDown,
  ChevronUp,
  Settings,
  MoreVertical,
  MoreHorizontal
} from 'lucide-react';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';
import TopLoadingBar from '@/components/TopLoadingBar';

interface Member {
  id: number;
  member_number: number;
  formatted_member_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  profile_photo_url: string;
  created_at: string;
  membership_status: 'none' | 'active' | 'expired';
  membership_details?: {
    plan_name: string;
    start_date: string;
    end_date: string;
    trainer_assigned?: string;
    batch_time?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const MembersPage = () => {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ phone_number: '', email: '' });
  const [updating, setUpdating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number; errors?: string[] } | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all'>('all');
  const [showSelection, setShowSelection] = useState(false);
  const [selectedMemberForDrawer, setSelectedMemberForDrawer] = useState<Member | null>(null);
  const [drawerData, setDrawerData] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch members when page or debounced search changes
  useEffect(() => {
    fetchMembers();
  }, [pagination.page, debouncedSearch]);

  // Refetch members when page becomes visible (e.g., after navigation back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && members.length === 0) {
        fetchMembers();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pagination.page, debouncedSearch, members.length]);

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
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      
      const response = await fetch(`/api/members?${params}`, {
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMembers(result.members);
        setPagination(result.pagination);
      } else {
        console.error('API returned error:', result.message);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const openDrawer = async (member: Member) => {
    setSelectedMemberForDrawer(member);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const response = await fetch(`/api/members/${member.id}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setDrawerData(result);
      } else {
        console.error('Failed to fetch member details:', result.message);
      }
    } catch (error) {
      console.error('Error fetching member details for drawer:', error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedMemberForDrawer(null);
    setDrawerData(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (pagination.totalPages <= maxVisible) {
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (pagination.page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(pagination.totalPages);
      } else if (pagination.page >= pagination.totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = pagination.totalPages - 3; i <= pagination.totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = pagination.page - 1; i <= pagination.page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(pagination.totalPages);
      }
    }
    return pages;
  };

  const handleImportFile = async () => {
    if (!importFile) return;

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', 'excel');

      const response = await fetch('/api/members/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setImportResult({
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          errors: result.errors
        });
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Refresh members list
        fetchMembers();
      } else {
        setImportResult({
          importedCount: 0,
          skippedCount: 0,
          errors: [result.message]
        });
      }
    } catch (error) {
      setImportResult({
        importedCount: 0,
        skippedCount: 0,
        errors: ['Error importing file: ' + (error as Error).message]
      });
    } finally {
      setImportLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getMembershipBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      none: 'bg-orange-100 text-orange-700'
    };
    
    const icons = {
      active: <CheckCircle className="w-3 h-3" />,
      expired: <AlertCircle className="w-3 h-3" />,
      none: <Clock className="w-3 h-3" />
    };
    
    // Handle null/undefined status
    if (!status) {
      status = 'none';
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status === 'none' ? 'No Membership' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

 const membersWithoutMembershipCount = members.filter(m =>
    m.membership_status === 'none' || m.membership_status === 'expired'
  ).length;

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.id));
    }
  };

  const handleDeleteModal = (mode: 'selected' | 'all') => {
    setDeleteMode(mode);
    setShowDeleteModal(true);
  };

  const handleDeleteMembers = async () => {
    setDeleteAllLoading(true);
    try {
      if (deleteMode === 'all') {
        const res = await fetch('/api/members/delete-all', { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to delete members');
      } else {
        for (const memberId of selectedMembers) {
          const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Failed to delete member ${memberId}`);
          }
        }
      }
      setShowDeleteModal(false);
      setSelectedMembers([]);
      setShowSelection(false);
      fetchMembers();
    } catch (error) {
      console.error('Error deleting members:', error);
      alert('Error: ' + (error as Error).message);
    } finally {
      setDeleteAllLoading(false);
    }
  };

    const handleDeleteAllMembers = async () => {
    if (!confirm(`Are you sure you want to delete ALL members? This action cannot be undone and will remove all members and their membership data.`)) {
      return;
    }

    setDeleteAllLoading(true);
    try {
      const response = await fetch('/api/members/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully deleted ${result.deletedCount} members`);
        // Refresh the members list
        fetchMembers();
      } else {
        alert('Failed to delete members: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting all members:', error);
      alert('Error deleting members: ' + (error as Error).message);
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Are you sure you want to delete ${memberName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        // Remove from UI immediately for better UX
        setMembers(prev => prev.filter(m => m.id !== memberId));
        // Refresh to ensure consistency
        setTimeout(() => fetchMembers(), 500);
      } else {
        console.error('Delete failed:', result.message);
        alert('Failed to delete member: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error deleting member: ' + (error as Error).message);
    }
  };

  const handleDeleteButtonClick = () => {
    if (!showSelection) {
      setShowSelection(true);
      return;
    }

    handleDeleteModal(selectedMembers.length > 0 ? 'selected' : 'all');
  };

  return (
    <>
      <TopLoadingBar />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">Manage your gym members and their subscriptions</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => router.push('/dashboard/add-members')}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 mr-2" />
            Add Member
          </button>
          {can('delete_members') && (
            <button
              onClick={handleDeleteButtonClick}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                showSelection 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showSelection 
                ? (selectedMembers.length > 0 ? `Delete Selected (${selectedMembers.length})` : 'Cancel Selection') 
                : 'Delete Members'}
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Import
          </button>
        </div>
      </div>

      {/* Stats and Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="text-2xl font-bold text-gray-900">{members.filter(m => m.membership_status === 'active').length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 md:col-span-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, ID or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {can('delete_members') && showSelection && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === members.length && members.length > 0}
                        onChange={selectAllMembers}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={can('delete_members') && showSelection ? 7 : 6} className="px-6 py-12">
                      <div className="flex items-center justify-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading members...
                      </div>
                    </td>
                  </tr>
                ) : (
                  members.map((member: Member, index: number) => (
                  <tr 
                    key={`${member.id}-${index}`} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openDrawer(member)}
                  >
                    {can('delete_members') && showSelection && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
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
                            SR.NO: {member.formatted_member_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>

                    {/* Gender */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {member.gender || 'N/A'}
                      </div>
                    </td>

                    {/* Membership Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getMembershipBadge(member.membership_status)}
                        {member.membership_details && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div>{member.membership_details.plan_name}</div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(member.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left" ref={activeDropdown === member.id ? dropdownRef : null}>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          <Settings className="w-5 h-5 transition-transform hover:rotate-90 duration-300" />
                        </button>

                        {activeDropdown === member.id && (
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="px-4 py-2 border-b border-gray-50 mb-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member Options</p>
                            </div>
                            <button
                              onClick={() => { router.push(`/dashboard/members/${member.id}`); setActiveDropdown(null); }}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-3 transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                <Eye className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold">View Profile</span>
                                <span className="text-[10px] text-gray-400">View detailed member info</span>
                              </div>
                            </button>
                            {can('edit_members') && (
                              <button
                                onClick={() => { handleEditMember(member); setActiveDropdown(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-all"
                              >
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                  <Edit className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold">Edit Member</span>
                                  <span className="text-[10px] text-gray-400">Modify member records</span>
                                </div>
                              </button>
                            )}
                            {can('delete_members') && (
                              <>
                                <div className="border-t border-gray-50 my-1"></div>
                                <button
                                  onClick={() => { handleDeleteMember(member.id, member.full_name); setActiveDropdown(null); }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-all"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold">Delete Member</span>
                                    <span className="text-[10px] text-gray-400 text-red-300">Permanent removal</span>
                                  </div>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {loading ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading members...</p>
              </div>
            ) : (
              members.map((member) => (
                <div 
                  key={member.id} 
                  className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer group relative"
                  onClick={() => openDrawer(member)}
                >
                  {can('delete_members') && showSelection && (
                    <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      {member.profile_photo_url ? (
                        <img
                          src={member.profile_photo_url}
                          alt={member.full_name}
                          className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2">
                        {getMembershipBadge(member.membership_status)}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{member.full_name}</h3>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">ID: {member.formatted_member_id}</p>
                    
                    <div className="w-full space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-xl">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{member.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-xl">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{member.email || 'No email'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/members/${member.id}`)}
                        className="flex-1 px-4 py-2.5 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-all shadow-md shadow-orange-100"
                      >
                        View Profile
                      </button>
                      <div className="relative" ref={activeDropdown === member.id ? dropdownRef : null}>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)}
                          className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors focus:outline-none"
                        >
                          <Settings className="w-5 h-5 transition-transform hover:rotate-90 duration-300" />
                        </button>
                        
                        {activeDropdown === member.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="px-4 py-2 border-b border-gray-50 mb-1 text-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member Options</p>
                            </div>
                            <button
                              onClick={() => { router.push(`/dashboard/members/${member.id}`); setActiveDropdown(null); }}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-3 transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                <Eye className="w-4 h-4" />
                              </div>
                              <span className="font-semibold">View Profile</span>
                            </button>
                            {can('edit_members') && (
                              <button
                                onClick={() => { handleEditMember(member); setActiveDropdown(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-all"
                              >
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                  <Edit className="w-4 h-4" />
                                </div>
                                <span className="font-semibold">Edit Member</span>
                              </button>
                            )}
                            {can('delete_members') && (
                              <>
                                <div className="border-t border-gray-50 my-1"></div>
                                <button
                                  onClick={() => { handleDeleteMember(member.id, member.full_name); setActiveDropdown(null); }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-all"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                  <span className="font-semibold">Delete Member</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> members
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    page === pagination.page
                      ? 'bg-orange-600 text-white'
                      : page === '...'
                      ? 'text-gray-400 cursor-default'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Member Drawer */}
      <div 
        className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ${
          selectedMemberForDrawer ? 'bg-black/20 opacity-100' : 'bg-transparent opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
      >
        <div 
          className={`w-full max-w-lg bg-white h-full shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            selectedMemberForDrawer ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedMemberForDrawer && (
            <>
              {/* Drawer Header */}
              <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  {getMembershipBadge(selectedMemberForDrawer.membership_status)}
                  <h3 className="text-lg font-bold text-gray-900">{selectedMemberForDrawer.formatted_member_id}</h3>
                </div>
                <button 
                  onClick={closeDrawer}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Member Profile Card */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {selectedMemberForDrawer.profile_photo_url ? (
                      <img 
                        src={selectedMemberForDrawer.profile_photo_url} 
                        className="w-full h-full object-cover rounded-2xl" 
                        alt="" 
                      />
                    ) : (
                      selectedMemberForDrawer.full_name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedMemberForDrawer.full_name}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedMemberForDrawer.phone_number}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(selectedMemberForDrawer.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => router.push(`/dashboard/members/${selectedMemberForDrawer.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 bg-blue-50 text-blue-600 rounded-xl font-semibold hover:bg-blue-100 transition-all text-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    ADD PAYMENT
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/members/${selectedMemberForDrawer.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    EDIT PROFILE
                  </button>
                </div>

                {drawerLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Loading member details...</p>
                  </div>
                ) : drawerData ? (
                  <>
                    {/* Collapsible Sections */}
                    <div className="space-y-4">
                      {/* Sale Overview */}
                      <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Overview</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Member Number</span>
                            <span className="font-bold text-gray-900">{selectedMemberForDrawer.formatted_member_id}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Gender</span>
                            <span className="font-semibold text-gray-900 px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase">{selectedMemberForDrawer.gender || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Joined Date</span>
                            <span className="font-bold text-gray-900">{formatDate(selectedMemberForDrawer.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Financials</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Paid</span>
                            <span className="font-bold text-green-600">
                              ₹{drawerData.paymentSummary?.total_paid ?? 
                                drawerData.transactions?.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0) ?? 0}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Balance Due</span>
                            <span className="font-bold text-red-600">
                              ₹{drawerData.paymentSummary?.total_pending ?? 
                                drawerData.payments?.reduce((sum: number, p: any) => sum + (Math.max(0, (parseFloat(p.total_amount) || 0) - (parseFloat(p.paid_amount) || 0))), 0) ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BMI Analysis */}
                      {drawerData.medicalInfo && (drawerData.medicalInfo.height || drawerData.medicalInfo.weight) && (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">BMI Analysis</h4>
                            {drawerData.medicalInfo.bmi_category && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                drawerData.medicalInfo.bmi_category === 'Normal' ? 'bg-green-100 text-green-700' :
                                drawerData.medicalInfo.bmi_category === 'Underweight' ? 'bg-blue-100 text-blue-700' :
                                drawerData.medicalInfo.bmi_category === 'Overweight' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {drawerData.medicalInfo.bmi_category}
                              </span>
                            )}
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">BMI Value</span>
                              <span className="font-bold text-gray-900">{drawerData.medicalInfo.bmi || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Fitness Goal</span>
                              <span className="font-bold text-orange-600">{drawerData.medicalInfo.fitness_goal || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50">
                              <span>Height: {drawerData.medicalInfo.height} cm</span>
                              <span>Weight: {drawerData.medicalInfo.weight} kg</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Memberships */}
                      <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Memberships</h4>
                        </div>
                        <div className="p-4 space-y-4">
                          {drawerData.memberships?.length > 0 ? (
                            drawerData.memberships.map((m: any, i: number) => (
                              <div key={i} className="flex flex-col gap-1 pb-3 last:pb-0 border-b last:border-0 border-gray-50">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-gray-900">{m.plan_name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                    new Date(m.end_date) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {new Date(m.end_date) > new Date() ? 'Active' : 'Expired'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[11px] text-gray-500">
                                  <span>{formatDate(m.start_date)} - {formatDate(m.end_date)}</span>
                                  <span className="font-bold text-gray-900">₹{m.plan_price || m.price || 0}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">No active memberships</p>
                          )}
                        </div>
                      </div>

                      {/* Payment History */}
                      <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment History</h4>
                        </div>
                        <div className="p-4">
                          {drawerData.transactions?.length > 0 ? (
                            <div className="space-y-4">
                              {drawerData.transactions.map((t: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                      <p className="text-xs font-bold text-gray-900 truncate">{t.description || 'Membership Payment'}</p>
                                      <p className="text-xs font-bold text-green-600">₹{t.amount}</p>
                                    </div>
                                    <div className="flex justify-between">
                                      <p className="text-[10px] text-gray-500">{formatDate(t.transaction_date)}</p>
                                      <p className="text-[10px] text-gray-400">{t.payment_mode}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">No payment history</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-500 mb-8">
                {deleteMode === 'all' 
                  ? 'Are you sure you want to delete ALL members? This action is irreversible.' 
                  : `Are you sure you want to delete ${selectedMembers.length} selected members? This action is irreversible.`}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMembers}
                  disabled={deleteAllLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {deleteAllLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {deleteMode === 'all' ? 'Delete All' : `Delete ${selectedMembers.length}`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Import Members</h3>
                  <p className="text-sm text-gray-500">Upload Excel file to bulk add members</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowImportModal(false); setImportResult(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-green-700 font-medium">Successfully imported {importResult.importedCount} members.</p>
                  {importResult.skippedCount > 0 && (
                    <p className="text-orange-600 text-sm mt-1">Skipped {importResult.skippedCount} existing members.</p>
                  )}
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 max-h-40 overflow-y-auto">
                    <p className="text-red-700 text-sm font-bold mb-2">Errors encountered:</p>
                    <ul className="text-red-600 text-xs list-disc pl-4 space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => { setShowImportModal(false); setImportResult(null); }}
                  className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".xlsx,.xls"
                  />
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <FileUp className="w-8 h-8 text-gray-400 group-hover:text-blue-600" />
                  </div>
                  <p className="text-gray-900 font-semibold">{importFile ? importFile.name : 'Click to select Excel file'}</p>
                  <p className="text-sm text-gray-500 mt-1">or drag and drop here</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportFile}
                    disabled={!importFile || importLoading}
                    className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      'Start Import'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

// Wrap with PageGuard to check permissions
export default function MembersPageWithGuard() {
  return (
    <PageGuard permission="view_members">
      <MembersPage />
    </PageGuard>
  );
}