import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { ActivityLogEntry } from '../types';
import { api } from '../services/api';

export const ActivityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.activity.list({
        category: category !== 'ALL' ? category : undefined,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                Audit Trail
              </span>
              <span className="text-xs text-slate-400">Security & Operational Logs</span>
            </div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Activity & Security Audit Stream
            </h2>
            <p className="max-w-2xl text-xs text-slate-400">
              Immutable operational audit trail logging authentications, file modifications, role transitions, and storage adapter calls. Passwords and credentials are never stored in logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={api.activity.getExportUrl('csv')}
              download="nexus-activity-logs.csv"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Export CSV</span>
            </a>

            <a
              href={api.activity.getExportUrl('json')}
              download="nexus-activity-logs.json"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <FileCode className="h-4 w-4 text-indigo-400" />
              <span>Export JSON</span>
            </a>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'AUTH', label: 'Auth & Login' },
            { id: 'STORAGE', label: 'Storage & Files' },
            { id: 'MODELS', label: 'AI Models' },
            { id: 'APK', label: 'APK Releases' },
            { id: 'USERS', label: 'User Roles' },
            { id: 'SETTINGS', label: 'Settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                category === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actions, users, or details..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        </form>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-indigo-400 mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No activity logs matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : log.status === 'FAILURE' ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {log.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                      {log.action}
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {log.userEmail}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <span className="line-clamp-2">{log.details}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
