'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CreditCard, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface MembershipPlan {
  id: number;
  plan_name: string;
  duration_months: number;
  price: number;
  created_at: string;
}

interface PlanFormData {
  plan_name: string;
  duration_months: number;
  price: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface DeleteConfirm {
  show: boolean;
  plan: MembershipPlan | null;
}

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    plan_name: '',
    duration_months: 1,
    price: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({ show: false, plan: null });

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/membership-plans');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = '/api/membership-plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = editingPlan 
        ? { ...formData, id: editingPlan.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        await fetchPlans();
        resetForm();
        showToast(editingPlan ? 'Plan updated successfully!' : 'Plan created successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to save plan', 'error');
      }
    } catch (error) {
      showToast('Error saving plan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      duration_months: plan.duration_months,
      price: plan.price
    });
    setShowForm(true);
  };

  const handleDelete = async (plan: MembershipPlan) => {
    setDeleteConfirm({ show: true, plan });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.plan) return;
    
    const plan = deleteConfirm.plan;
    setDeleteLoading(plan.id);
    setDeleteConfirm({ show: false, plan: null });
    
    try {
      const response = await fetch(`/api/membership-plans?id=${plan.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchPlans();
        showToast('Plan deleted successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to delete plan', 'error');
      }
    } catch (error) {
      showToast('Error deleting plan', 'error');
    } finally {
      setDeleteLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({ plan_name: '', duration_months: 1, price: 0 });
    setEditingPlan(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
              <p className="text-gray-600">Manage gym membership plans and pricing</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingPlan ? 'Edit Plan' : 'Add New Plan'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingPlan ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">{plan.plan_name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="text-gray-400 hover:text-orange-600 p-1 rounded transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      disabled={deleteLoading === plan.id}
                      className="text-gray-400 hover:text-red-600 p-1 rounded transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-orange-600 mb-2">₹{plan.price}</div>
                  <div className="text-gray-600 flex items-center justify-center gap-1 mb-2">
                    <Calendar className="w-4 h-4" />
                    {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                    ₹{(plan.price / plan.duration_months).toFixed(0)}/month
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 text-center">
                  Created: {new Date(plan.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
                toast.type === 'success' ? 'bg-green-500 text-white' :
                toast.type === 'error' ? 'bg-red-500 text-white' :
                'bg-yellow-500 text-white'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              <span className="font-medium">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 hover:opacity-70"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Plan</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>"{deleteConfirm.plan?.plan_name}"</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm({ show: false, plan: null })}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {plans.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No membership plans available</p>
            <p className="text-gray-400">Create your first membership plan to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}