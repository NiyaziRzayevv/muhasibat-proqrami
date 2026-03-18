import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, RefreshCw, CheckCircle, Loader2, Edit3, Search, Filter, X, FileSpreadsheet, TrendingUp, Users, ShoppingCart, Wrench, Calendar } from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { getCurrencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

function getStatusMap(t) {
  return {
    odenilib: { label: t('statusPaid'), cls: 'status-odenilib' },
    gozleyir: { label: t('statusWaiting'), cls: 'status-gozleyir' },
    qismen: { label: t('statusPartial'), cls: 'status-qismen' },
    borc: { label: t('statusDebt'), cls: 'status-borc' },
  };
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)}`;
}

export default function Debts() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const STATUS_MAP = getStatusMap(t);
  const userId = isAdmin ? null : currentUser?.id;
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (userId) filters.userId = userId;
      if (search) filters.search = search;
      let res;
      if (window.api?.getDebts) {
        res = await window.api.getDebts(filters);
      } else {
        const params = new URLSearchParams(filters).toString();
        res = await apiRequest(`/debts?${params}`);
      }
      if (res?.success) setDebts(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId, search]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  function openPayModal(debt) {
    setPayModal(debt);
    setPayAmount(debt.remaining_amount || '');
    setPayMethod('cash');
  }

  async function handlePay() {
    setPaying(true);
    try {
      const amount = parseFloat(payAmount) || 0;
      if (amount <= 0) { showNotification('Məbləğ daxil edin', 'error'); setPaying(false); return; }

      const payload = {
        debt_type: payModal.debt_type,
        debt_id: payModal.debt_id,
        amount,
        payment_method: payMethod,
      };

      let res;
      if (window.api?.payDebt) {
        res = await window.api.payDebt(payload);
      } else {
        res = await apiRequest('/debts/pay', { method: 'POST', body: payload });
      }

      if (res?.success) {
        showNotification(`Ödəniş qeyd edildi: ${amount.toFixed(2)} ${csym}`, 'success');
        setPayModal(null);
        loadDebts();
      } else {
        showNotification(res?.error || 'Xəta', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setPaying(false);
    }
  }

  const recordDebts = debts.filter(d => d.debt_type === 'record');
  const saleDebts = debts.filter(d => d.debt_type === 'sale');
  const recordDebt = recordDebts.reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const salesDebt = saleDebts.reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const totalDebt = recordDebt + salesDebt;
  const totalRecords = recordDebts.length;
  const totalSales = saleDebts.length;

  // Filter logic
  const filtered = debts.filter(d => {
    if (tab === 'services' && d.debt_type !== 'record') return false;
    if (tab === 'sales' && d.debt_type !== 'sale') return false;
    if (dateFrom && d.date < dateFrom) return false;
    if (dateTo && d.date > dateTo) return false;
    return true;
  });

  function handleExportExcel() {
    try {
      if (!filtered.length) { showNotification('Export üçün məlumat yoxdur', 'error'); return; }
      const rows = filtered.map(d => ({
        'Tip': d.debt_type === 'record' ? 'Servis' : 'Satış',
        'Tarix': d.date,
        'Müştəri': d.customer_name || '',
        'Sənəd №': d.ref_number || '',
        'Təsvir': d.description || '',
        [`Ümumi (${csym})`]: d.total_amount || 0,
        [`Ödənilib (${csym})`]: d.paid_amount || 0,
        [`Qalıq (${csym})`]: d.remaining_amount || 0,
        'Status': d.payment_status === 'borc' ? 'Borc' : 'Qismən',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const colWidths = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, ...rows.map(r => String(r[k] || '').length + 2)) }));
      ws['!cols'] = colWidths;
      // Total row
      const totalAll = filtered.reduce((s, d) => s + (d.total_amount || 0), 0);
      const totalPaid = filtered.reduce((s, d) => s + (d.paid_amount || 0), 0);
      const totalRem = filtered.reduce((s, d) => s + (d.remaining_amount || 0), 0);
      XLSX.utils.sheet_add_aoa(ws, [['YEKUN', '', '', '', '', totalAll, totalPaid, totalRem, '']], { origin: -1 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Borclar');
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `borclar_${today}.xlsx`);
      showNotification('Excel export edildi', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Borclar</h1>
          <p className="text-sm text-dark-400 mt-0.5">
            {totalRecords + totalSales} borc · Ümumi:{' '}
            <span className="text-red-400 font-semibold">{fmt(totalDebt)}</span>
            <span className="ml-2 text-dark-500">({fmt(recordDebt)} servis + {fmt(salesDebt)} satış)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-xs py-1.5" title="Excel Export">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={loadDebts} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-dark-800 rounded-xl p-1">
          {[
            { key: 'all', label: 'Hamısı', count: totalRecords + totalSales },
            { key: 'services', label: 'Servislər', count: totalRecords, Icon: Wrench },
            { key: 'sales', label: 'Satışlar', count: totalSales, Icon: ShoppingCart },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
              {t.Icon && <t.Icon size={12} />}
              {t.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${tab === t.key ? 'bg-white/20' : 'bg-dark-700'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-8 h-8 text-xs" placeholder="Müştəri axtar..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 bg-dark-800 border border-dark-700 rounded-xl px-2 h-8">
          <Calendar size={11} className="text-dark-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none w-28" />
          <span className="text-dark-600 text-xs">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none w-28" />
        </div>
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }} className="text-dark-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {!loading && (totalRecords > 0 || totalSales > 0) && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="card p-4 border border-red-800/30 bg-red-900/10">
            <p className="text-xs text-dark-400">Ümumi Borc</p>
            <p className="text-xl font-bold text-red-400 mt-1">{fmt(totalDebt)}</p>
            <p className="text-[10px] text-dark-500 mt-1">{totalRecords + totalSales} qeyd</p>
          </div>
          <div className="card p-4 border border-purple-800/30 bg-purple-900/10">
            <p className="text-xs text-dark-400 flex items-center gap-1"><Wrench size={10} /> Servis Borcları</p>
            <p className="text-xl font-bold text-purple-400 mt-1">{fmt(recordDebt)}</p>
            <p className="text-[10px] text-dark-500 mt-1">{totalRecords} qeyd</p>
          </div>
          <div className="card p-4 border border-blue-800/30 bg-blue-900/10">
            <p className="text-xs text-dark-400 flex items-center gap-1"><ShoppingCart size={10} /> Satış Borcları</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{fmt(salesDebt)}</p>
            <p className="text-[10px] text-dark-500 mt-1">{totalSales} qeyd</p>
          </div>
          <div className="card p-4 border border-amber-800/30 bg-amber-900/10">
            <p className="text-xs text-dark-400">Gözləyən</p>
            <p className="text-xl font-bold text-amber-400 mt-1">
              {fmt(recordDebts.filter(r => r.payment_status === 'gozleyir').reduce((s, r) => s + (r.remaining_amount || 0), 0))}
            </p>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="loading-spinner w-8 h-8" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tip</th>
                <th>Tarix</th>
                <th>Müştəri</th>
                <th>Sənəd</th>
                <th>Ümumi</th>
                <th>Ödənilib</th>
                <th>Qalıq</th>
                <th>Status</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>
                    {d.debt_type === 'record' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400"><Wrench size={10} className="inline mr-1" />Servis</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400"><ShoppingCart size={10} className="inline mr-1" />Satış</span>
                    )}
                  </td>
                  <td className="font-mono text-xs text-dark-300">{d.date}</td>
                  <td className="text-dark-200">{d.customer_name || '—'}</td>
                  <td className="font-medium text-white">{d.ref_number || d.description || '—'}</td>
                  <td className="font-semibold text-white">{fmt(d.total_amount)}</td>
                  <td className="text-dark-300">{fmt(d.paid_amount)}</td>
                  <td className="font-bold text-red-400">{fmt(d.remaining_amount)}</td>
                  <td>
                    <span className={STATUS_MAP[d.payment_status]?.cls || 'status-badge bg-dark-700 text-dark-400'}>
                      {STATUS_MAP[d.payment_status]?.label || d.payment_status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openPayModal(d)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50 rounded-lg transition-colors">
                      <CheckCircle size={12} /> Ödəniş al
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="empty-state">
                      <CheckCircle size={36} className="text-emerald-600 mb-3" />
                      <p className="text-dark-300 font-medium">Bütün ödənişlər tamamlanıb!</p>
                      <p className="text-dark-600 text-xs mt-1">Heç bir ödənilməmiş qeyd yoxdur</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title="Ödəniş Qeyd Et"
        size="sm"
        footer={
          <>
            <button onClick={() => setPayModal(null)} className="btn-secondary">Ləğv et</button>
            <button onClick={handlePay} disabled={paying} className="btn-success">
              {paying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Ödənişi təsdiqlə
            </button>
          </>
        }
      >
        {payModal && (
          <div className="space-y-4">
            <div className="card p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-dark-400">Müştəri:</span>
                <span className="text-white font-medium">{payModal.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-400">Tip:</span>
                <span className="text-white">{payModal.debt_type === 'record' ? 'Servis' : 'Satış'} — {payModal.description || payModal.ref_number || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-400">Ümumi məbləğ:</span>
                <span className="text-white font-semibold">{fmt(payModal.total_amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-400">Əvvəl ödənilib:</span>
                <span className="text-emerald-400">{fmt(payModal.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-dark-700">
                <span className="text-dark-300 font-medium">Qalıq borc:</span>
                <span className="text-red-400 font-bold">{fmt(payModal.remaining_amount)}</span>
              </div>
            </div>
            <div>
              <label className="label">İndi alınan məbləğ ({csym})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                max={payModal.remaining_amount}
                className="input-field"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Ödəniş üsulu</label>
              <select className="select-field" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="cash">Nağd</option>
                <option value="card">Kart</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
