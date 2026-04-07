'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Calendar, Shield, Trash2, User, Plus, Edit, AlertTriangle, X, Copy, Check, KeyRound, Eye, EyeOff, KeySquare } from 'lucide-react';
import Link from 'next/link';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';
import Toast from '@/app/components/Toast';

// Pre-fetch at module import time — before React mounts
const prefetchPromise =
  typeof window !== 'undefined'
    ? Promise.all([
        fetch('/api/admin/staff').then(r => r.json()),
        fetch('/api/admin/roles').then(r => r.json()),
      ])
    : null;

function OurStaffPage() {
  const { can } = usePermission();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role_id: '' });
  const [roles, setRoles] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ name: string; email: string; password: string; role: string; emailSent: boolean } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [resetModal, setResetModal] = useState<{ id: number; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ password: string; emailSent: boolean } | null>(null);
  const prefetchConsumed = useRef(false);

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: number; name: string } | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check for new staff credentials from sessionStorage
  useEffect(() => {
    // Small delay to ensure sessionStorage is written before we read
    const timer = setTimeout(() => {
      const stored = sessionStorage.getItem('newStaffCredentials');
      if (stored) {
        setNewCredentials(JSON.parse(stored));
        sessionStorage.removeItem('newStaffCredentials');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllCredentials = async () => {
    if (!newCredentials) return;
    const loginUrl = window.location.origin + '/auth/login';
    const text = `Staff Login Credentials\nName: ${newCredentials.name}\nRole: ${newCredentials.role}\nEmail: ${newCredentials.email}\nPassword: ${newCredentials.password}\nLogin URL: ${loginUrl}`;
    await navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchStaff = async () => {
    try {
      const data = await fetch('/api/admin/staff').then(r => r.json());
      if (data.staff) setStaff(data.staff);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !resetPassword.trim()) return;
    setResetLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${resetModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(staff.map((s: any) =>
          s.id === resetModal.id ? { ...s, password: resetPassword.trim() } : s
        ));
        setResetResult({ password: resetPassword.trim(), emailSent: data.emailSent });
        setToast({ message: 'Password reset successfully', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to reset password', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to reset password', type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteClick = (staffId: number, staffName: string) => {
    setStaffToDelete({ id: staffId, name: staffName });
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setStaffToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;

    setDeleteLoading(staffToDelete.id);
    try {
      const res = await fetch(`/api/admin/staff/delete?id=${staffToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setStaff(staff.filter((member: any) => member.id !== staffToDelete.id));
        setShowDeleteModal(false);
        setStaffToDelete(null);
        setToast({ message: 'Staff member deleted successfully', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to delete staff member', type: 'error' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast({ message: 'Failed to delete staff member', type: 'error' });
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let staffData: any, rolesData: any;
        if (prefetchPromise && !prefetchConsumed.current) {
          prefetchConsumed.current = true;
          [staffData, rolesData] = await prefetchPromise;
        } else {
          [staffData, rolesData] = await Promise.all([
            fetch('/api/admin/staff').then(r => r.json()),
            fetch('/api/admin/roles').then(r => r.json()),
          ]);
        }
        if (staffData?.staff) setStaff(staffData.staff);
        if (rolesData?.roles) setRoles(rolesData.roles.filter((r: any) => !r.is_protected && r.name.toLowerCase() !== 'admin'));
      } catch (error) {
        console.error('Error loading staff data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEdit = (member: any) => {
    setEditingStaff(member);
    setEditForm({
      name: member.name,
      email: member.email,
      role_id: member.role_id || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingStaff(null);
    setEditForm({ name: '', email: '', role_id: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setStaff(staff.map((s: any) => 
          s.id === editingStaff.id 
            ? { ...s, name: editForm.name, email: editForm.email, role_id: editForm.role_id }
            : s
        ));
        handleCancelEdit();
        setToast({ message: 'Staff member updated successfully', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to update staff member', type: 'error' });
      }
    } catch (error) {
      console.error('Update error:', error);
      setToast({ message: 'Failed to update staff member', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Our Staff</h1>
              <p className="text-gray-600">Manage staff members</p>
            </div>
          </div>
          {can('add_staff') && (
            <Link
              href="/dashboard/add-staff"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </Link>
          )}
        </div>

        {/* New Staff Credentials Banner */}
        {newCredentials && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-green-100 border-b border-green-200">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-green-700" />
                <span className="font-semibold text-green-800 text-sm">Staff Added — Login Credentials</span>
                {!newCredentials.emailSent && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-full">Email not sent — share manually</span>
                )}
              </div>
              <button onClick={() => setNewCredentials(null)} className="text-green-600 hover:text-green-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Name', value: newCredentials.name, key: 'name' },
                  { label: 'Role', value: newCredentials.role, key: 'role' },
                  { label: 'Email', value: newCredentials.email, key: 'email' },
                  { label: 'Password', value: newCredentials.password, key: 'password' },
                ].map(({ label, value, key }) => (
                  <div key={key} className="flex items-center justify-between bg-white border border-green-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className="ml-3 p-1.5 rounded hover:bg-green-100 text-green-600 transition"
                      title={`Copy ${label}`}
                    >
                      {copiedField === key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={copyAllCredentials}
                className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900 border border-green-300 bg-white px-4 py-2 rounded-lg hover:bg-green-50 transition"
              >
                {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedField === 'all' ? 'Copied!' : 'Copy All Credentials'}
              </button>
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Staff</h2>
              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {staff.length} {staff.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : staff.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No reception staff added yet</p>
                <p className="text-sm text-gray-400 mt-1">Add your first staff member</p>
              </div>
            ) : (
              <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                    <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                    <th className="w-1/12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map((member: any) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {member.role || 'Staff'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-900">
                            {visiblePasswords[member.id] ? member.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(member.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition"
                            title={visiblePasswords[member.id] ? 'Hide' : 'Show'}
                          >
                            {visiblePasswords[member.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {member.password && (
                            <button
                              onClick={() => copyToClipboard(member.password, `pwd-${member.id}`)}
                              className="p-1 text-gray-400 hover:text-orange-600 transition"
                              title="Copy password"
                            >
                              {copiedField === `pwd-${member.id}` ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.is_verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {can('edit_staff') && member.role?.toLowerCase() !== 'admin' && (
                            <button
                              onClick={() => { setResetModal({ id: member.id, name: member.name }); setResetPassword(''); setResetResult(null); }}
                              className="p-1 rounded transition text-gray-400 hover:text-orange-600"
                              title="Reset password"
                            >
                              <KeySquare className="w-4 h-4" />
                            </button>
                          )}
                          {can('edit_staff') && member.role?.toLowerCase() !== 'admin' && (
                            <button 
                              onClick={() => handleEdit(member)}
                              className="p-1 rounded transition text-gray-400 hover:text-blue-600"
                              title="Edit staff"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {can('delete_staff') && (
                            <button 
                              onClick={() => handleDeleteClick(member.id, member.name)}
                              disabled={deleteLoading === member.id || member.role?.toLowerCase() === 'admin'}
                              className={`p-1 rounded transition ${
                                member.role?.toLowerCase() === 'admin'
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : deleteLoading === member.id
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-red-600'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && staffToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Staff Member</h3>
                  <p className="text-sm text-red-600">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{staffToDelete.name}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                All associated data will be permanently removed from the system.
              </p>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleteLoading === staffToDelete.id}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading === staffToDelete.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {deleteLoading === staffToDelete.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Staff Member</h3>
              <p className="text-sm text-gray-500">Update staff details</p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role_id}
                  onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                >
                  <option value="">Select Role</option>
                  {roles.map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updating}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center">
                <KeySquare className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reset Password</h3>
                <p className="text-xs text-gray-500">{resetModal.name}</p>
              </div>
              <button onClick={() => { setResetModal(null); setResetPassword(''); setResetResult(null); }} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!resetResult ? (
              <>
                <div className="px-6 py-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new plain-text password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm text-gray-900"
                    autoFocus
                  />
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => { setResetModal(null); setResetPassword(''); setResetResult(null); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading || !resetPassword.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    {resetLoading ? 'Saving...' : 'Reset Password'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-5 space-y-3">
                  <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
                    resetResult.emailSent ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {resetResult.emailSent
                      ? <><Check className="w-4 h-4" /> Email sent with new credentials</>
                      : <><X className="w-4 h-4" /> Email not sent — share manually</>}
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs text-gray-500">New Password</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">{resetResult.password}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(resetResult!.password)}
                      className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition"
                      title="Copy password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                  <button
                    onClick={() => { setResetModal(null); setResetPassword(''); setResetResult(null); }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Wrap with PageGuard to check permissions
function OurStaffPageWithGuard() {
  return (
    <PageGuard permissions={['view_staff', 'add_staff', 'delete_staff', 'edit_staff']}>
      <OurStaffPage />
    </PageGuard>
  );
}

export default OurStaffPageWithGuard;