'use client';

import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';

interface Member {
  id: number;
  full_name: string;
  phone_number: string;
  email: string;
  gender: string;
  date_of_birth: string;
  profile_photo_url: string;
  created_at: string;
}

const MembersPage = () => {
  const router = useRouter();
  const { can, isAdmin } = usePermission();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ phone_number: '', email: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

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
      console.log('Fetching members...');
      const response = await fetch('/api/members', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('API result:', result);
      
      if (result.success) {
        setMembers(result.members);
        console.log('Members set:', result.members.length);
      } else {
        console.error('API returned error:', result.message);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phone_number.includes(searchTerm) ||
                         (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600 mt-1">Manage gym members</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Total Members: <span className="font-semibold text-gray-900">{members.length}</span>
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
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Members Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member, index) => (
                  <tr key={`${member.id}-${index}`} className="hover:bg-gray-50">
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
                            ID: #{member.id}
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
                          {/* Edit button - allows inline editing of member's phone and email
                              Only visible to users with 'edit_members' permission */}
                          {can('edit_members') && (
                            <button
                              onClick={() => handleEditMember(member)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit contact info"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new member.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => (
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
                      <p className="text-sm text-gray-500">ID: #{member.id}</p>
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
                <button
                  onClick={() => router.push(`/dashboard/members/${member.id}`)}
                  className="text-orange-600 hover:text-orange-900 text-sm font-medium cursor-pointer"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new member.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
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