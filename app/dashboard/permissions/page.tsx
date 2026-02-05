'use client';

import { useState, useEffect } from 'react';
import { Shield, Save, Users } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Module {
  name: string;
  permissions: string[];
}

interface Modules {
  [key: string]: Module;
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [modules, setModules] = useState<Modules>({});
  const [rolePermissions, setRolePermissions] = useState<{[key: string]: string[]}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      const data = await response.json();
      if (response.ok) {
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: number) => {
    try {
      const response = await fetch(`/api/admin/permissions?roleId=${roleId}`);
      const data = await response.json();
      if (response.ok) {
        setRolePermissions(data.rolePermissions || {});
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const handlePermissionChange = (module: string, permission: string, checked: boolean) => {
    setRolePermissions(prev => {
      const updated = { ...prev };
      if (!updated[module]) updated[module] = [];
      
      if (checked) {
        if (!updated[module].includes(permission)) {
          updated[module] = [...updated[module], permission];
        }
      } else {
        updated[module] = updated[module].filter(p => p !== permission);
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRole,
          permissions: rolePermissions
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Permissions updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      setMessage('Error updating permissions');
    } finally {
      setSaving(false);
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
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
          <p className="text-gray-600">Manage module-based permissions for each role</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select Role
          </h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedRole === role.id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{role.name}</div>
                {role.description && (
                  <div className="text-sm text-gray-500">{role.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Configuration */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {selectedRole ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Module Permissions</h2>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  message.includes('successfully') 
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="space-y-6">
                {Object.entries(modules).map(([moduleKey, module]) => (
                  <div key={moduleKey} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{module.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {module.permissions.map((permission) => (
                        <label key={permission} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rolePermissions[moduleKey]?.includes(permission) || false}
                            onChange={(e) => handlePermissionChange(moduleKey, permission, e.target.checked)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {permission.replace(/_/g, ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a role to configure permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}