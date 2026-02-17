'use client';

import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Save,
  CreditCard
} from 'lucide-react';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';
import Toast from '@/app/components/Toast';
import GymLoader from '@/components/GymLoader';

const SettingsPage = () => {
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState('payments');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    paymentModes: {
      Cash: { enabled: true, processingFee: 0 },
      UPI: { enabled: true, processingFee: 1.5 },
      Card: { enabled: true, processingFee: 2.5 },
      Online: { enabled: true, processingFee: 2.0 },
      Cheque: { enabled: true, processingFee: 0 }
    }
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setToast({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setToast({ type: 'success', message: 'Settings saved successfully!' });
      } else {
        setToast({ type: 'error', message: data.message || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'payments', label: 'Payment Modes', icon: CreditCard }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your gym configuration and preferences</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <GymLoader size="md" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Mode Settings</h3>
                <p className="text-sm text-gray-600 mb-6">Configure processing fees for different payment modes</p>
                
                <div className="space-y-4">
                  {Object.entries(settings.paymentModes).map(([mode, config]) => (
                    <div key={mode} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                          <h4 className="text-sm font-medium text-gray-900">{mode}</h4>
                        </div>
                        {can('manage_settings') ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.enabled}
                              onChange={(e) => setSettings({
                                ...settings,
                                paymentModes: {
                                  ...settings.paymentModes,
                                  [mode]: { ...config, enabled: e.target.checked }
                                }
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        ) : (
                          <span className={`text-sm font-medium ${config.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                            {config.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </div>
                      
                      {config.enabled && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Processing Fee (%)
                          </label>
                          {can('manage_settings') ? (
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={config.processingFee}
                                onChange={(e) => setSettings({
                                  ...settings,
                                  paymentModes: {
                                    ...settings.paymentModes,
                                    [mode]: { ...config, processingFee: parseFloat(e.target.value) || 0 }
                                  }
                                })}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-800"
                                placeholder=""
                                min=""
                                max="10"
                                step="0.1"
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900 font-medium">
                              {config.processingFee}%
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Fee will be added to the payment amount
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>

        {can('manage_settings') && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
};

// Wrap with PageGuard to check permissions
function SettingsPageWithGuard() {
  return (
    <PageGuard permission="manage_settings">
      <SettingsPage />
    </PageGuard>
  );
}

export default SettingsPageWithGuard;