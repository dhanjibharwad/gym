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
  Dumbbell
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (!document.hidden) {
        fetchMembers();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pagination.page, debouncedSearch]);

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
        _t: Date.now().toString()
      });
      
      const response = await fetch(`/api/members?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store'
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
    m.membership_status === 'none' || 
    m.membership_status === 'expired'
  ).length;
  
  console.log('[Members Page] Total members:', members.length);
  console.log('[Members Page] Without membership count:', membersWithoutMembershipCount);
  if (members.length > 0) {
    console.log('[Members Page] First member status:', members[0].membership_status);
  }

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
      let response;
      
      if (deleteMode === 'all') {
        response = await fetch('/api/members/delete-all', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
      } else {
        // Delete selected members
        const deletePromises = selectedMembers.map(memberId =>
          fetch(`/api/members/${memberId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          })
        );
        
        const results = await Promise.all(deletePromises);
        const failedDeletes = results.filter(res => !res.ok);
        
        if (failedDeletes.length === 0) {
          setDeleteAllLoading(false);
          setShowDeleteModal(false);
          setSelectedMembers([]);
          fetchMembers();
          return;
        } else {
          throw new Error(`${failedDeletes.length} members could not be deleted`);
        }
      }

      const result = await response.json();

      if (result.success) {
        setDeleteAllLoading(false);
        setShowDeleteModal(false);
        setSelectedMembers([]);
        fetchMembers();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error deleting members:', error);
      setDeleteAllLoading(false);
      alert('Error deleting members: ' + (error as Error).message);
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
          <p className="text-gray-600 mt-1">Manage gym members</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Assign Membership Button - Always show */}
          <button
            onClick={() => window.location.href = '/dashboard/membership-management'}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm cursor-pointer"
            title="Assign memberships to members"
          >
            <User className="w-4 h-4" />
            Assign Membership
            {membersWithoutMembershipCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {membersWithoutMembershipCount}
              </span>
            )}
          </button>
          
          <span className="text-sm text-gray-500">
            Total Members: <span className="font-semibold text-gray-900">{pagination.total.toLocaleString()}</span>
          </span>
          
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Cards
            </button>
          </div>

          {/* Import Button */}
          <button
            onClick={() => window.open('/api/members/template', '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            <FileUp className="w-4 h-4" />
            Download Template
          </button>

          {/* Bulk Import Button */}
          <button
            onClick={() => router.push('/dashboard/bulk-import')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
          >
            <FileUp className="w-4 h-4" />
            Bulk Import
          </button>

          {/* Delete Actions - Only visible to users with delete_members permission */}
          {can('delete_members') && (
            <button
              onClick={handleDeleteButtonClick}
              disabled={pagination.total === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {showSelection
                ? (selectedMembers.length > 0
                  ? `Delete Selected (${selectedMembers.length})`
                  : `Delete All (${pagination.total})`)
                : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {membersWithoutMembershipCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-orange-900">
              <span className="font-semibold">{membersWithoutMembershipCount}</span>{' '}
              member{membersWithoutMembershipCount > 1 ? 's' : ''} without membership. Assign now.
            </div>
            <button
              onClick={() => router.push('/dashboard/bulk-import?step=assign')}
              className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              Assign Membership
            </button>
          </div>
        </div>
      )}

      

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 placeholder-gray-500 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500 animate-spin" />
            )}
          </div>
          
          {/* Items per page selector */}
          <select
            value={pagination.limit}
            onChange={(e) => {
              setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-700"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Members Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {can('delete_members') && showSelection && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === members.length && members.length > 0}
                        onChange={selectAllMembers}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
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
                        Loading members...
                      </div>
                    </td>
                  </tr>
                ) : (
                  members.map((member: Member, index: number) => (
                  <tr key={`${member.id}-${index}`} className="hover:bg-gray-50">
                    {can('delete_members') && showSelection && (
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      {editingMember === member.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <input
                              type="tel"
                              value={editForm.phone_number}
                              onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
                            />
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-40"
                            />
                          </div>
                        </div>
                      ) : (
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
                      )}
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
                            {member.membership_details.trainer_assigned && (
                              <div>Trainer: {member.membership_details.trainer_assigned}</div>
                            )}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingMember === member.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updating}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Save changes"
                          >
                            {updating ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/dashboard/members/${member.id}`)}
                            className="px-3 py-1 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
                            title="View profile"
                          >
                            View
                          </button>
                          
                          {/* Add/Manage Membership button - visible when member has no/expired membership */}
                          {(member.membership_status === 'none' || member.membership_status === 'expired') && (
                            <button
                              onClick={() => router.push(`/dashboard/members/${member.id}`)}
                              className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                              title={member.membership_status === 'none' ? 'Add membership' : 'Renew membership'}
                            >
                              {member.membership_status === 'none' ? 'Add Membership' : 'Renew'}
                            </button>
                          )}
                          
                          {/* Edit button - allows inline editing of member's phone and email
                              Only visible to users with 'edit_members' permission */}
                          {/* {can('edit_members') && (
                            <button
                              onClick={() => handleEditMember(member)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit contact info"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )} */}
                          {/* Delete button - only visible to users with 'delete_members' permission */}
                          {/* {can('delete_members') && (
                            <button
                              onClick={() => handleDeleteMember(member.id, member.full_name)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete member"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )} */}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>

          {members.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {debouncedSearch ? 'Try adjusting your search.' : 'Get started by adding a new member.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              Loading members...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member: Member, index: number) => (
            <div key={`${member.id}-${index}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {member.profile_photo_url ? (
                        <img
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          src={member.profile_photo_url}
                          alt={member.full_name}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center border-2 border-gray-200">
                          <span className="text-xl font-bold text-white">
                            {member.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {member.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">SR.NO: {member.formatted_member_id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 pb-4 space-y-3">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {member.phone_number}
                  </div>
                  {member.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {member.email}
                    </div>
                  )}
                </div>

                {/* Member Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">
                    <div>Gender: {member.gender || 'N/A'}</div>
                    <div className="mt-1">DOB: {member.date_of_birth ? formatDate(member.date_of_birth) : 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Joined {formatDate(member.created_at)}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/dashboard/members/${member.id}`)}
                    className="text-orange-600 hover:text-orange-900 text-sm font-medium cursor-pointer"
                  >
                    View Profile
                  </button>
                  {can('delete_members') && (
                    <button
                      onClick={() => handleDeleteMember(member.id, member.full_name)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Delete member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {members.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {debouncedSearch ? 'Try adjusting your search.' : 'Get started by adding a new member.'}
              </p>
            </div>
          )}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> members
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) => (
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      disabled={loading}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pagination.page === page
                          ? 'bg-orange-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage || loading}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Import Members</h2>
              <button onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportResult(null);
              }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${importResult.importedCount > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="font-semibold text-gray-900">Import Results</p>
                  <p className="text-sm text-gray-700 mt-2">
                    Imported: <span className="font-semibold">{importResult.importedCount}</span> members
                  </p>
                  <p className="text-sm text-gray-700">
                    Skipped: <span className="font-semibold">{importResult.skippedCount}</span> records
                  </p>
                </div>
                
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <p className="font-semibold text-sm text-yellow-800 mb-2">Issues Found:</p>
                    <ul className="space-y-1">
                      {importResult.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx} className="text-xs text-yellow-700">{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li className="text-xs text-yellow-700 italic">... and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportResult(null);
                      setImportFile(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setImportFile(null);
                    }}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                  >
                    Import Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload an Excel or PDF file with member data to import.</p>
                
                {/* Download Template Button */}
                <a
                  href="/api/members/template"
                  download="Member_Import_Template.xlsx"
                  className="block px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-center text-sm transition-colors"
                >
                  Download Template
                </a>

                <p className="text-xs text-gray-500 italic">Download the template, fill in your member details, and upload it back.</p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Archive className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Choose file to upload</p>
                  <p className="text-xs text-gray-500">Excel (.xlsx, .xls)</p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {importFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">Selected: {importFile.name}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportFile}
                    disabled={!importFile || importLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4" />
                        Import
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200" 
            style={{ 
              position: 'relative',
              zIndex: 100000,
              backgroundColor: 'white',
              maxWidth: '500px'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {deleteMode === 'all' ? 'Delete All Members' : 'Delete Selected Members'}
              </h2>
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">
                      {deleteMode === 'all' 
                        ? 'You are about to delete ALL members from the gym.'
                        : `You are about to delete ${selectedMembers.length} member(s).`
                      }
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      This action cannot be undone and will permanently remove all member data including their membership history.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {deleteMode === 'all' 
                  ? `This will delete all ${pagination.total} members and their associated data.`
                  : `This will delete the selected ${selectedMembers.length} members and their associated data.`
                }
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteAllLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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