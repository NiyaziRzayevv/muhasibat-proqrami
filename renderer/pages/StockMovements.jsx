import React, { useState, useEffect, useCallback } from 'react';
import { Search, ArrowDown, ArrowUp, RefreshCw, Filter, X, ArrowLeftRight, FileSpreadsheet, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

function getMovementTypes(t) {
  return [
    { value: '', label: t('all') },
    { value: 'giris', label: t('stockIn') },
    { value: 'cixis', label: t('stockOut') },
    { value: 'satis', label: t('smartSale') },
    { value: 'servis', label: t('service') },
    { value: 'duzeltme', label: t('stockAdjust') },
  ];
}

function getTypeStyles(t) {
  return {
    giris:    { icon: ArrowDown, cls: 'text-emerald-400 bg-emerald-900/20', label: t('stockIn') },
    cixis:    { icon: ArrowUp,   cls: 'text-red-400 bg-red-900/20',         label: t('stockOut') },
    satis:    { icon: ArrowUp,   cls: 'text-blue-400 bg-blue-900/20',       label: t('smartSale') },
    servis:   { icon: ArrowUp,   cls: 'text-purple-400 bg-purple-900/20',   label: t('service') },
    duzeltme: { icon: ArrowLeftRight, cls: 'text-amber-400 bg-amber-900/20', label: t('stockAdjust') },
  };
}

export default function StockMovements() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const { t } = useLanguage();
  const MOVEMENT_TYPES = getMovementTypes(t);
  const TYPE_STYLES = getTypeStyles(t);
  const userId = isAdmin ? null : currentUser?.id;
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ movement_type: '', startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showChart, setShowChart] = useState(true);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const reqParams = {
        movement_type: filters.movement_type || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        ...(userId ? { userId } : {}),
      };

      const res = window.api?.getStockMovements
        ? await window.api.getStockMovements(reqParams)
        : await apiRequest(`/stock/movements?${new URLSearchParams(reqParams).toString()}`, { token: getToken() });
      if (res.success) {
        let data = res.data;
        if (search) data = data.filter(m => m.product_name?.toLowerCase().includes(search.toLowerCase()) || m.note?.toLowerCase().includes(search.toLowerCase()));
        setMovements(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters, search, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalIn  = movements.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter(m => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0);

  // Chart data - group by date
  const chartData = movements.reduce((acc, m) => {
    const date = (m.created_at ? String(m.created_at).slice(0, 10) : null) || 'N/A';
    if (!acc[date]) acc[date] = { date, giris: 0, cixis: 0 };
    if (m.qty > 0) acc[date].giris += m.qty;
    else acc[date].cixis += Math.abs(m.qty);
    return acc;
  }, {});
  const chartArray = Object.values(chartData).slice(-10);

  async function handleExportExcel() {
    try {
      const rows = movements.map(m => ({
        tarix: (m.created_at ? String(m.created_at).slice(0, 10) : null), mehsul: m.product_name, nov: TYPE_STYLES[m.movement_type]?.label || m.movement_type,
        miqdar: m.qty, qeyd: m.note
      }));

      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(rows, `stok-hereketleri-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) {
          showNotification('Excel hazır oldu', 'success');
          window.api.showItemInFolder(result.path);
        }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stok');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stok-hereketleri-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification('Excel hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stok Hərəkətləri</h1>
          <p className="text-sm text-dark-400 mt-0.5">
            {movements.length} qeyd
            <span className="ml-3 text-emerald-400">▲ {totalIn.toFixed(2)} giriş</span>
            <span className="ml-3 text-red-400">▼ {totalOut.toFixed(2)} çıxış</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-xs py-1.5" title="Excel Export">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={() => setShowChart(!showChart)} className={`btn-secondary text-xs py-1.5 ${showChart ? 'border-primary-500 text-primary-400' : ''}`}>
            <TrendingUp size={13} /> Qrafik
          </button>
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <p className="text-xs text-dark-400 flex items-center gap-1"><ArrowDown size={10} /> Giriş</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{totalIn.toFixed(0)}</p>
        </div>
        <div className="card p-4 border border-red-800/30 bg-red-900/10">
          <p className="text-xs text-dark-400 flex items-center gap-1"><ArrowUp size={10} /> Çıxış</p>
          <p className="text-xl font-bold text-red-400 mt-1">{totalOut.toFixed(0)}</p>
        </div>
        <div className="card p-4 border border-blue-800/30 bg-blue-900/10">
          <p className="text-xs text-dark-400 flex items-center gap-1"><Package size={10} /> Net</p>
          <p className={`text-xl font-bold mt-1 ${totalIn - totalOut >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(totalIn - totalOut).toFixed(0)}</p>
        </div>
        <div className="card p-4 border border-dark-700 bg-dark-800/50">
          <p className="text-xs text-dark-400">Qeyd sayı</p>
          <p className="text-xl font-bold text-white mt-1">{movements.length}</p>
        </div>
      </div>

      {/* Chart */}
      {showChart && chartArray.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-xs text-dark-400 mb-3">Son 10 gün hərəkətləri</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartArray}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Bar dataKey="giris" fill="#10b981" name="Giriş" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cixis" fill="#ef4444" name="Çıxış" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Məhsul adı, qeyd..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-xs py-2 ${showFilters ? 'border-primary-500 text-primary-400' : ''}`}>
          <Filter size={13} /> Filter
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          <div>
            <label className="label text-xs">Əməliyyat növü</label>
            <select className="select-field text-xs h-8" value={filters.movement_type}
              onChange={e => setFilters(f => ({ ...f, movement_type: e.target.value }))}>
              {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Başlanğıc</label>
            <input type="date" className="input-field text-xs h-8" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">Son tarix</label>
            <input type="date" className="input-field text-xs h-8" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ movement_type: '', startDate: '', endDate: '' })} className="btn-secondary text-xs h-8 w-full">
              <X size={12} /> Sıfırla
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarix / Saat</th>
                <th>Əməliyyat</th>
                <th>Məhsul</th>
                <th>Miqdar</th>
                <th>Əvvəlki stok</th>
                <th>Yeni stok</th>
                <th>Qeyd</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <div className="empty-state">
                    <ArrowLeftRight size={36} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Stok hərəkəti yoxdur</p>
                  </div>
                </td></tr>
              ) : movements.map(m => {
                const style = TYPE_STYLES[m.movement_type] || TYPE_STYLES.duzeltme;
                const Icon = style.icon;
                return (
                  <tr key={m.id}>
                    <td className="font-mono text-xs text-dark-400">{m.created_at?.split('T')[0] || m.created_at?.slice(0, 10)}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${style.cls}`}>
                        <Icon size={11} />
                        {style.label}
                      </span>
                    </td>
                    <td className="font-medium text-white">{m.product_name || '—'}</td>
                    <td className={`font-bold text-base ${m.qty > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {m.qty > 0 ? '+' : ''}{m.qty} {m.unit || ''}
                    </td>
                    <td className="text-dark-400">{m.qty_before ?? '—'} {m.unit || ''}</td>
                    <td className="text-white font-medium">{m.qty_after ?? '—'} {m.unit || ''}</td>
                    <td className="text-dark-400 text-xs max-w-[160px] truncate">{m.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
