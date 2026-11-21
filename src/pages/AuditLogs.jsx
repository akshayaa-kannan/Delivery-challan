import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Download, 
  Filter, 
  Calendar, 
  User, 
  ShieldAlert, 
  Loader2, 
  Clock, 
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs, generateCSVString } from '../utils/storage';

export default function AuditLogs() {
  const { currentCompany } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, [currentCompany?.id]);

  const loadLogs = async () => {
    if (!currentCompany?.id) return;
    try {
      setLoading(true);
      const data = await getAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Action', 'Resource Type', 'Resource ID', 'Details'];
    const rows = filteredLogs.map(l => [
      l.timestamp || '',
      l.actorName || l.actorUid || 'System',
      l.actorEmail || '',
      l.action || '',
      l.resourceType || '',
      l.resourceId || '',
      l.details || ''
    ]);

    const csvContent = generateCSVString(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Trail_${currentCompany?.displayName || 'Nayaruvi'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter computation
  const filteredLogs = logs.filter(log => {
    // Action filter
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;

    // Date filter
    if (dateFilter !== 'ALL' && log.timestamp) {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      if (dateFilter === 'TODAY') {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === '7DAYS') {
        const diff = (now - logDate) / (1000 * 60 * 60 * 24);
        if (diff > 7) return false;
      } else if (dateFilter === '30DAYS') {
        const diff = (now - logDate) / (1000 * 60 * 60 * 24);
        if (diff > 30) return false;
      }
    }

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchActor = (log.actorName || '').toLowerCase().includes(q) || (log.actorEmail || '').toLowerCase().includes(q);
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      const matchResource = (log.resourceId || '').toLowerCase().includes(q);
      if (!matchActor && !matchAction && !matchDetails && !matchResource) return false;
    }

    return true;
  });

  const getActionColor = (action) => {
    if (action.includes('TRANSFERRED') || action.includes('DELETED') || action.includes('REVOKED')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('CREATED') || action.includes('ACCEPTED') || action.includes('INVITED')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('ROLE_CHANGED') || action.includes('UPDATED')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="text-amber-500" size={28} />
            Enterprise Audit Trail
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Immutable system audit logs recording privileged administrative actions, memberships, and configuration changes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLogs}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-40"
          >
            <FileSpreadsheet size={16} className="text-amber-400" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, action, or details..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="ALL">All Recorded Actions ({uniqueActions.length})</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today Only</option>
            <option value="7DAYS">Past 7 Days</option>
            <option value="30DAYS">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-amber-500" size={32} />
          <div className="text-sm font-semibold text-slate-500">Retrieving audit events...</div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <History className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-base font-bold text-slate-800">No audit events match your filters</h3>
          <p className="text-sm text-slate-500 mt-1">Actions performed by team members are logged here automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">Resource Target</th>
                  <th className="px-6 py-3.5">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const dateStr = log.timestamp 
                    ? new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : '—';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                        {dateStr}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                            {(log.actorName || log.actorEmail || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{log.actorName || 'System'}</div>
                            <div className="text-[10px] text-slate-400">{log.actorEmail}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex text-[11px] font-black px-2.5 py-0.5 rounded-md border font-mono ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        <div className="font-bold text-slate-800">{log.resourceType || '—'}</div>
                        <div className="font-mono text-[10px] text-slate-400">{log.resourceId || ''}</div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-700">
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
