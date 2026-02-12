'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Edit, Trash2, AlertTriangle, Shield } from 'lucide-react';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';
import Toast from '@/app/components/Toast';

interface Role {
  id: number;
  name: string;
  description: string;
  is_protected: boolean;
  is_system_role: boolean;
  permission_count: number;
  user_count: number;
}

function RolesPage() {
  const { can } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  
  // Toast state using shared Toast component
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const showToastMessage = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description });
    setShowForm(true);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRoleToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    
    setDeleteLoading(roleToDelete.id);
    try {
      const response = await fetch(`/api/admin/roles?id=${roleToDelete.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        setRoles(roles.filter(r => r.id !== roleToDelete.id));
        setShowDeleteModal(false);
        setRoleToDelete(null);
        showToastMessage('Role deleted successfully!', 'success');
      } else {
        showToastMessage(data.error || 'Failed to delete role', 'error');
      }
    } catch (error) {
      showToastMessage('Error deleting role', 'error');
    } finally {
      setDeleteLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingRole(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = '/api/admin/roles';
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole ? { ...formData, id: editingRole.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (editingRole) {
          setRoles(roles.map(r => r.id === editingRole.id ? data.role : r));
          showToastMessage('Role updated successfully!', 'success');
        } else {
          setRoles([...roles, data.role]);
          showToastMessage('Role created successfully!', 'success');
        }
        resetForm();
      } else {
        showToastMessage(data.error || 'Failed to save role', 'error');
      }
    } catch (error) {
      showToastMessage('Error saving role', 'error');
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
        {can('manage_roles') && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., Trainer, Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                rows={3}
                placeholder="Role description..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (editingRole ? 'Updating...' : 'Creating...') : (editingRole ? 'Update Role' : 'Create Role')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Existing Roles</h2>
        </div>
        <div className="p-6">
          {roles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No roles created yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {roles.map((role) => {
                const isProtected = role.is_protected || role.name.toLowerCase() === 'admin';
                return (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        {isProtected && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Protected</span>
                        )}
                        {role.is_system_role && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">System</span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-gray-600 text-sm mt-1">{role.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {role.permission_count || 0} permissions
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {role.user_count || 0} users
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {can('manage_roles') && (
                        <>
                          <button
                            onClick={() => handleEdit(role)}
                            disabled={isProtected}
                            className={`p-1 rounded transition ${
                              isProtected 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-orange-600 cursor-pointer'
                            }`}
                            title={isProtected ? 'Cannot edit protected role' : 'Edit role'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(role)}
                            disabled={deleteLoading === role.id || isProtected}
                            className={`p-1 rounded transition ${
                              isProtected 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : deleteLoading === role.id
                                ? 'text-gray-400 cursor-not-allowed opacity-50'
                                : 'text-gray-400 hover:text-red-600 cursor-pointer'
                            }`}
                            title={isProtected ? 'Cannot delete protected role' : 'Delete role'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Role</h3>
                  <p className="text-sm text-red-600">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-6">
              <p className="text-gray-700">
                Are you sure you want to delete the role <span className="font-semibold text-gray-900">"{roleToDelete.name}"</span>?
              </p>
              {roleToDelete.user_count > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    This role is assigned to {roleToDelete.user_count} user{roleToDelete.user_count !== 1 ? 's' : ''}.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-3">
                All associated permissions will be removed from this role.
              </p>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleteLoading === roleToDelete.id}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading === roleToDelete.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {deleteLoading === roleToDelete.id ? (
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

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Wrap with PageGuard to check permissions
function RolesPageWithGuard() {
  return (
    <PageGuard permissions={['view_roles', 'manage_roles']}>
      <RolesPage />
    </PageGuard>
  );
}

export default RolesPageWithGuard;