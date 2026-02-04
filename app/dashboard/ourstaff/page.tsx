'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Shield, Trash2, User, Plus } from 'lucide-react';
import Link from 'next/link';

export default function OurStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const fetchStaff = async () => {
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
  }, []);

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
          <Link
            href="/admin/add-staff"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </Link>
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
                              {member.role === 'admin' ? 'Administrator' : 'Reception Staff'}
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
                          <button 
                            onClick={() => handleDelete(member.id, member.name)}
                            disabled={deleteLoading === member.id || member.role === 'admin'}
                            className={`p-1 rounded transition ${
                              member.role === 'admin' 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : deleteLoading === member.id
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
}