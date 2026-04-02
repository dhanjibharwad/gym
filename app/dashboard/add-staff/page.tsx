'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, User, AlertCircle, CheckCircle, Users, Shield, ArrowLeft, Copy, Check, Eye, EyeOff } from 'lucide-react';
import Dropdown from '@/app/components/Dropdown';
import { PageGuard } from '@/components/rbac/PageGuard';

interface Role {
  id: number;
  name: string;
  description: string;
  is_protected?: boolean;
}

function AddStaffPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: '',
    password: '',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string; role: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        // Filter out admin role - staff cannot be assigned admin role
        const nonAdminRoles = data.roles.filter((role: Role) => 
          role.name.toLowerCase() !== 'admin' && !role.is_protected
        );
        setRoles(nonAdminRoles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.roleId) {
      setError('Please select a role');
      return;
    }

    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/add-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          roleId: parseInt(formData.roleId),
          password: formData.password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add staff member');
        return;
      }

      setCreatedCredentials({
        name: data.user.name,
        email: data.user.email,
        password: formData.password.trim(),
        role: data.user.role,
        emailSent: data.emailSent,
      });
      setFormData({ name: '', email: '', roleId: '', password: '' });
      setShowPassword(false);
    } catch (err) {
      console.error('Add staff error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Staff Member</h1>
              <p className="text-gray-600">Create a new staff account with role assignment</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Credentials Card — shown after successful creation */}
            {createdCredentials && (
              <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-green-100 border-b border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-700" />
                    <span className="font-semibold text-green-800 text-sm">Staff Created Successfully</span>
                  </div>
                  {!createdCredentials.emailSent && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-full">Email not sent — copy manually</span>
                  )}
                  {createdCredentials.emailSent && (
                    <span className="text-xs bg-green-200 text-green-800 border border-green-300 px-2 py-0.5 rounded-full">Email sent ✓</span>
                  )}
                </div>
                <div className="px-4 py-4 space-y-2">
                  {[
                    { label: 'Name', value: createdCredentials.name, key: 'name' },
                    { label: 'Role', value: createdCredentials.role, key: 'role' },
                    { label: 'Email', value: createdCredentials.email, key: 'email' },
                    { label: 'Password', value: createdCredentials.password, key: 'password' },
                  ].map(({ label, value, key }) => (
                    <div key={key} className="flex items-center justify-between bg-white border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm font-mono font-medium text-gray-900 truncate">
                          {key === 'password'
                            ? (showPassword ? value : '••••••••')
                            : value}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {key === 'password' && (
                          <button onClick={() => setShowPassword(p => !p)} className="p-1.5 rounded hover:bg-green-100 text-green-600 transition">
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button onClick={() => copyToClipboard(value, key)} className="p-1.5 rounded hover:bg-green-100 text-green-600 transition">
                          {copied === key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const text = `Name: ${createdCredentials.name}\nRole: ${createdCredentials.role}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nLogin: ${window.location.origin}/auth/login`;
                      copyToClipboard(text, 'all');
                    }}
                    className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900 border border-green-300 bg-white px-4 py-2 rounded-lg hover:bg-green-50 transition w-full justify-center mt-1"
                  >
                    {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied === 'all' ? 'Copied!' : 'Copy All Credentials'}
                  </button>
                </div>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full placeholder-slate-400 pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-gray-900"
                  placeholder="Enter staff member's full name"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <Dropdown
                options={roles.map(role => ({
                  value: role.id.toString(),
                  label: role.name
                }))}
                value={formData.roleId}
                onChange={(value) => setFormData({ ...formData, roleId: value })}
                placeholder="Select a role"
                disabled={rolesLoading}
              />
              {rolesLoading && (
                <p className="mt-2 text-sm text-gray-500">Loading roles...</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 placeholder-slate-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-gray-900"
                  placeholder="Enter staff member's email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input
                  id="password"
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 placeholder-slate-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-gray-900"
                  placeholder="Set a password for this staff member"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">What happens next?</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>A staff account will be created with the selected role</li>
                    <li>The password you set will be saved and emailed to the staff member</li>
                    <li>Staff member can log in immediately with these credentials</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 focus:ring-1 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Staff...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Staff Member
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setFormData({ name: '', email: '', roleId: '', password: '' });
                  setError('');
                  setSuccess('');
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-1 focus:ring-gray-500 focus:ring-offset-2 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Wrap with PageGuard to check permissions
function AddStaffPageWithGuard() {
  return (
    <PageGuard permission="add_staff">
      <AddStaffPage />
    </PageGuard>
  );
}

export default AddStaffPageWithGuard;