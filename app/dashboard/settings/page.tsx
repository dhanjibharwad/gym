'use client';

import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Save,
  CreditCard,
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  ShieldCheck
} from 'lucide-react';
import { PageGuard } from '@/components/rbac/PageGuard';
import { usePermission } from '@/components/rbac/PermissionGate';
import Toast from '@/app/components/Toast';
import TopLoadingBar from '@/components/TopLoadingBar';

const SettingsPage = () => {
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState('payments');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [smtp, setSmtp] = useState({ host: '', port: '587', secure: false, user: '', password: '', fromName: '' });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpConfigs, setSmtpConfigs] = useState<any[]>([]);
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '587', username: '', password: '', fromName: '' });
  const [smtpAdding, setSmtpAdding] = useState(false);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);

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
      const [settingsRes, smtpRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/smtp-configs'),
      ]);
      const settingsData = await settingsRes.json();
      const smtpData = await smtpRes.json();
      if (settingsData.success) setSettings(settingsData.settings);
      if (smtpData.success) setSmtpConfigs(smtpData.configs);
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSmtp = async () => {
    setSmtpAdding(true);
    try {
      const res = await fetch('/api/settings/smtp-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'SMTP added successfully' });
        setShowSmtpForm(false);
        setSmtpForm({ host: '', port: '587', username: '', password: '', fromName: '' });
        const r = await fetch('/api/settings/smtp-configs');
        const d = await r.json();
        if (d.success) setSmtpConfigs(d.configs);
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to add SMTP' });
      }
    } catch { setToast({ type: 'error', message: 'Failed to add SMTP' }); }
    finally { setSmtpAdding(false); }
  };

  const handleSetActive = async (id: number) => {
    await fetch('/api/settings/smtp-configs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSmtpConfigs(smtpConfigs.map(c => ({ ...c, is_active: c.id === id })));
    setToast({ type: 'success', message: 'Active SMTP updated' });
  };

  const handleDeleteSmtp = async (id: number) => {
    const res = await fetch('/api/settings/smtp-configs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) {
      const updated = smtpConfigs.filter(c => c.id !== id);
      // if deleted was active, mark first remaining as active
      const wasActive = smtpConfigs.find(c => c.id === id)?.is_active;
      if (wasActive && updated.length > 0) updated[0].is_active = true;
      setSmtpConfigs(updated);
      setToast({ type: 'success', message: 'SMTP removed' });
    }
  };

  const handleTestSmtp = async (config: any) => {
    if (!testEmail) { setToast({ type: 'error', message: 'Enter a test email address first' }); return; }
    setTestingId(config.id);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/smtp-configs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, testEmail }),
      });
      const data = await res.json();
      setTestResult({ id: config.id, success: data.success, message: data.success ? 'Test email sent!' : data.error });
    } catch { setTestResult({ id: config.id, success: false, message: 'Request failed' }); }
    finally { setTestingId(null); }
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
    { id: 'payments', label: 'Payment Modes', icon: CreditCard },
    { id: 'smtp', label: 'SMTP / Email', icon: Mail },
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
        <TopLoadingBar isLoading={true} progress={30} />
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
          {activeTab === 'smtp' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">SMTP Configurations</h3>
                  <p className="text-sm text-gray-500">Active config is used first. If it fails, next one activates automatically.</p>
                </div>
                <button onClick={() => setShowSmtpForm(!showSmtpForm)} className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Add SMTP
                </button>
              </div>

              {/* Test email input */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Enter email to test SMTP (e.g. you@gmail.com)" className="flex-1 bg-transparent text-sm text-gray-900 outline-none" />
              </div>

              {/* Add form */}
              {showSmtpForm && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800">New SMTP Configuration</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Host</label>
                      <input type="text" value={smtpForm.host} onChange={e => setSmtpForm({...smtpForm, host: e.target.value})} placeholder="smtp.gmail.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                      <input type="number" value={smtpForm.port} onChange={e => setSmtpForm({...smtpForm, port: e.target.value})} placeholder="587" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email (Username)</label>
                    <input type="email" value={smtpForm.username} onChange={e => setSmtpForm({...smtpForm, username: e.target.value})} placeholder="you@gmail.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <input type="text" value={smtpForm.password} onChange={e => setSmtpForm({...smtpForm, password: e.target.value})} placeholder="App password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From Name</label>
                    <input type="text" value={smtpForm.fromName} onChange={e => setSmtpForm({...smtpForm, fromName: e.target.value})} placeholder="Gym Management" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowSmtpForm(false)} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleAddSmtp} disabled={smtpAdding} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
                      {smtpAdding ? 'Saving...' : 'Save SMTP'}
                    </button>
                  </div>
                </div>
              )}

              {/* Config list */}
              {smtpConfigs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No SMTP configured yet. Click "Add SMTP" to get started.</div>
              ) : (
                <div className="space-y-3">
                  {smtpConfigs.map(config => (
                    <div key={config.id} className={`border rounded-xl p-4 ${config.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {config.is_active ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <Mail className="w-4 h-4 text-gray-400" />}
                            <span className="text-sm font-semibold text-gray-900">{config.username}</span>
                            {config.is_active && <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded-full font-medium">Active</span>}
                          </div>
                          <p className="text-xs text-gray-500">{config.host}:{config.port} &bull; {config.from_name}</p>
                          {testResult?.id === config.id && (
                            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${testResult!.success ? 'text-green-600' : 'text-red-600'}`}>
                              {testResult!.success ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {testResult!.message}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleTestSmtp(config)} disabled={testingId === config.id} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Test this SMTP">
                            {testingId === config.id ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600"></div> : <Send className="w-3.5 h-3.5" />}
                          </button>
                          {!config.is_active && (
                            <button onClick={() => handleSetActive(config.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition" title="Set as active">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteSmtp(config.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {can('manage_settings') && activeTab === 'payments' && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
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