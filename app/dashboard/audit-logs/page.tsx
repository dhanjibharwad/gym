'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, User, Activity, Search } from 'lucide-react';
import Toast from '@/app/components/Toast';
import { PageGuard } from '@/components/rbac/PageGuard';
import { cachedFetch, clientCacheGet } from '@/lib/clientCache';

interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  user_role: string;
  created_at: string;
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Logs' },
    { id: 'auth', label: 'Login/Logout' },
    { id: 'membership', label: 'Membership Plans' },
    { id: 'staff', label: 'Staff' },
    { id: 'member', label: 'Members' },
    { id: 'payment', label: 'Payments' },
    { id: 'settings', label: 'Settings' },
  ];

  const filterLogsByTab = (log: AuditLog) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'auth') return log.action === 'LOGIN' || log.action === 'LOGOUT';
    if (activeTab === 'membership') return log.entity_type === 'membership_plan';
    if (activeTab === 'staff') return log.entity_type === 'staff';
    if (activeTab === 'member') return log.entity_type === 'member';
    if (activeTab === 'payment') return log.entity_type === 'payment';
    if (activeTab === 'settings') return log.entity_type === 'settings';
    return true;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  useEffect(() => {
    const init = async () => {
      const cached = clientCacheGet<any>('/api/audit-logs?page=1&limit=100');
      if (cached?.success) { setLogs(cached.logs); setLoading(false); }
      try {
        const data = await cachedFetch<any>('/api/audit-logs?page=1&limit=100');
        if (data.success) setLogs(data.logs);
        else setError(data.message || 'Failed to load audit logs');
      } catch {
        setError('Unable to load audit logs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-green-100 text-green-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      case 'CREATE': return 'bg-blue-100 text-blue-800';
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-36 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-gray-600">Track all staff activities including login/logout and changes</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 placeholder-slate-400 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-transparent outline-none w-80"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No audit logs found</p>
              <p className="text-gray-400">Activity logs will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(() => {
                const filteredLogs = logs.filter((log) => {
                  const query = searchQuery.toLowerCase();
                  const matchesSearch = log.details.toLowerCase().includes(query) || log.user_role.toLowerCase().includes(query);
                  return matchesSearch && filterLogsByTab(log);
                });

                if (filteredLogs.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-2">No {activeTab === 'all' ? '' : tabs.find(t => t.id === activeTab)?.label.toLowerCase() + ' '}logs found</p>
                    </div>
                  );
                }

                return filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                          <span className="text-sm text-gray-500 capitalize">{log.entity_type.replace('_', ' ')}</span>
                          <span className="text-sm text-gray-400">ID: {log.entity_id}</span>
                        </div>
                        <p className="text-gray-900 mb-2">{log.details}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1"><User className="w-4 h-4" /><span className="capitalize">{log.user_role}</span></div>
                          <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{formatDateTime(log.created_at)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditLogsPageWithGuard() {
  return (
    <PageGuard permission="view_audit_logs">
      <AuditLogsPage />
    </PageGuard>
  );
}

export default AuditLogsPageWithGuard;
