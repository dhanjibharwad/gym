'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Shield, Trash2, User, Plus, Edit } from 'lucide-react';
import Link from 'next/link';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';

function OurStaffPage() {
  const { can } = usePermission();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role_id: '' });
  const [roles, setRoles] = useState([]);
  const [updating, setUpdating] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (res.ok) {
        setStaff(data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (res.ok && data.roles) {
        setRoles(data.roles.filter((r: any) => !r.is_protected && r.name.toLowerCase() !== 'admin'));
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleDelete = async (staffId: number, staffName: string) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(staffId);
    try {
      const res = await fetch(`/api/admin/staff/delete?id=${staffId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setStaff(staff.filter((member: any) => member.id !== staffId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete staff member');
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchRoles();
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
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update staff member');
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
              <p className="text-gray-600">Manage reception staff members</p>
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

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Reception Staff</h2>
              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {staff.length} {staff.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading staff...</p>
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
                              onClick={() => handleEdit(member)}
                              className="p-1 rounded transition text-gray-400 hover:text-blue-600"
                              title="Edit staff"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {can('delete_staff') && (
                            <button 
                              onClick={() => handleDelete(member.id, member.name)}
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

      {/* Edit Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role_id}
                  onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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