import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Trash2, X, RefreshCw, Clock, User, FileSpreadsheet, Calendar } from 'lucide-react';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';

const ACTION_COLORS = {
  LOGIN: 'text-emerald-400 bg-emerald-500/10',
  CREATE: 'text-blue-400 bg-blue-500/10',
  CREATE_USER: 'text-blue-400 bg-blue-500/10',
  CREATE_EXPENSE: 'text-amber-400 bg-amber-500/10',
  UPDATE: 'text-primary-400 bg-primary-500/10',
  UPDATE_USER: 'text-primary-400 bg-primary-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
  DELETE_USER: 'text-red-400 bg-red-500/10',
  DELETE_EXPENSE: 'text-red-400 bg-red-500/10',
  LICENSE_ACTIVATED: 'text-purple-400 bg-purple-500/10',
};

export default function AuditLog() {
  const { showNotification } = useApp();
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  useEffect(() => { loadLogs(); }, [search, filterType, filterStart, filterEnd]);

  async function loadLogs() {
    setLoading(true);
    try {
      const filters = { limit: 200 };
      if (search) filters.search = search;
      if (filterType) filters.entity_type = filterType;
      if (filterStart) filters.startDate = filterStart;
      if (filterEnd) filters.endDate = filterEnd;
      const res = await apiBridge.getAuditLogs(filters);
      if (res.success) setLogs(res.data || []);
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!confirm('90 gündən köhnə logları silmək istəyirsiniz?')) return;
    const res = await apiBridge.clearAuditLogs(90);
    if (res.success) {
      showNotification(`${res.data} log silindi`, 'success');
      await loadLogs();
    } else {
      showNotification(res.error || 'Xəta', 'error');
    }
  }

  async function handleExportExcel() {
    try {
      const result = await window.api.exportExcel(logs.map(l => ({
        tarix: formatDate(l.created_at), istifadeci: l.username || l.user_id, emeliyyat: l.action,
        nov: l.entity_type, id: l.entity_id, detallar: l.details
      })), `audit-log-${new Date().toISOString().split('T')[0]}.xlsx`);
      if (result.success) {
        showNotification('Excel hazır oldu', 'success');
        window.api.showItemInFolder(result.path);
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  function formatDate(dt) {
    if (!dt) return '-';
    try {
      return new Date(dt).toLocaleString('az-AZ');
    } catch { return dt; }
  }

  const ENTITY_TYPES = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <Activity size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Audit Log</h1>
            <p className="text-dark-400 text-xs">Sistem fəaliyyət tarixçəsi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 text-sm text-dark-400 hover:text-white bg-dark-800 hover:bg-dark-700 px-3 py-2 rounded-xl transition-colors">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={loadLogs} className="p-2 hover:bg-dark-800 text-dark-400 hover:text-white rounded-xl transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleClear} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 bg-dark-800 hover:bg-dark-700 px-3 py-2 rounded-xl transition-colors">
            <Trash2 size={14} />
            Köhnəni sil
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-dark-800 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
            placeholder="Axtar..."
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="">Bütün növlər</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
        {(search || filterType || filterStart || filterEnd) && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterStart(''); setFilterEnd(''); }}
            className="text-dark-400 hover:text-white transition-colors"><X size={16} /></button>
        )}
        <span className="text-xs text-dark-500 ml-auto">{logs.length} log</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <Activity size={48} className="mb-3 opacity-30" />
            <p>Log tapılmadı</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800/50">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-3 hover:bg-dark-900/50 transition-colors">
                <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg mt-0.5 ${ACTION_COLORS[log.action] || 'text-dark-400 bg-dark-800'}`}>
                  {log.action?.replace(/_/g, ' ')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {log.entity_type && (
                      <span className="text-dark-400">{log.entity_type}</span>
                    )}
                    {log.entity_id && (
                      <span className="text-dark-600">#{log.entity_id}</span>
                    )}
                  </div>
                  {log.new_data && (
                    <p className="text-xs text-dark-500 mt-0.5 truncate">
                      {(() => { try { const d = JSON.parse(log.new_data); return Object.entries(d).slice(0,3).map(([k,v]) => `${k}: ${v}`).join(', '); } catch { return log.new_data; } })()}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 text-xs text-dark-400">
                    <User size={11} />
                    <span>{log.user_name || 'Sistem'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-dark-600 mt-0.5">
                    <Clock size={11} />
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
