import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, RefreshCw, CheckCircle, Loader2, Edit3, Search, Filter, X, FileSpreadsheet, TrendingUp, Users, ShoppingCart, Wrench, Calendar } from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import * as XLSX from 'xlsx';

const STATUS_MAP = {
  odenilib: { label: 'Ödənilib', cls: 'status-odenilib' },
  gozleyir: { label: 'Gözləyir', cls: 'status-gozleyir' },
  qismen: { label: 'Qismən', cls: 'status-qismen' },
  borc: { label: 'Borc', cls: 'status-borc' },
};

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)} ₼`;
}

export default function Debts() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [records, setRecords] = useState([]);
  const [salesDebts, setSalesDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payStatus, setPayStatus] = useState('odenilib');
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadDebts = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, salesRes] = await Promise.all([
        window.api?.getUnpaidRecords
          ? window.api.getUnpaidRecords(userId)
          : apiRequest(`/records/unpaid${userId ? `?userId=${userId}` : ''}`, { token: getToken() }),
        window.api?.getSales
          ? window.api.getSales({ payment_status: 'borc', userId })
          : apiRequest(`/sales?${new URLSearchParams({ ...(userId ? { userId } : {}), payment_status: 'borc' }).toString()}`, { token: getToken() }),
      ]);
      if (recRes.success) setRecords(recRes.data || []);
      if (salesRes.success) {
        const debts = (salesRes.data || []).filter(s => (s.total || 0) > (s.paid_amount || 0));
        setSalesDebts(debts);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  function openPayModal(record) {
    setPayModal(record);
    setPayAmount(record.remaining_amount || record.total_price || '');
    setPayStatus(record.remaining_amount > 0 && record.remaining_amount < record.total_price ? 'qismen' : 'odenilib');
  }

  async function handlePay() {
    setPaying(true);
    try {
      const totalPrice = payModal.total_price || 0;
      const newPaid = parseFloat(payAmount) || 0;
      const prevPaid = payModal.paid_amount || 0;
      const totalPaid = prevPaid + newPaid;
      const remaining = Math.max(0, totalPrice - totalPaid);

      let status = payStatus;
      if (totalPaid >= totalPrice) status = 'odenilib';
      else if (totalPaid > 0) status = 'qismen';

      const result = payModal?.isSale
        ? (window.api?.updateSalePayment
          ? await window.api.updateSalePayment(payModal.id, totalPaid, status)
          : await apiRequest(`/sales/${payModal.id}/payment`, {
            method: 'PUT',
            token: getToken(),
            body: { paid_amount: totalPaid, payment_status: status },
          }))
        : (window.api?.updateRecord
          ? await window.api.updateRecord(payModal.id, {
            paid_amount: totalPaid,
            remaining_amount: remaining,
            payment_status: status,
          })
          : await apiRequest(`/records/${payModal.id}`, {
            method: 'PUT',
            token: getToken(),
            body: { paid_amount: totalPaid, remaining_amount: remaining, payment_status: status },
          }));

      if (result.success) {
        showNotification('Ödəniş qeyd edildi', 'success');
        setPayModal(null);
        loadDebts();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setPaying(false);
    }
  }

  const recordDebt = records.reduce((s, r) => s + (r.remaining_amount || 0), 0);
  const salesDebt = salesDebts.reduce((s, r) => s + ((r.total || 0) - (r.paid_amount || 0)), 0);
  const totalDebt = recordDebt + salesDebt;
  const totalRecords = records.length;
  const totalSales = salesDebts.length;

  // Filter logic
  const filteredRecords = records.filter(r => {
    if (search && !r.customer_name?.toLowerCase().includes(search.toLowerCase()) && !r.car_brand?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  const filteredSales = salesDebts.filter(s => {
    if (search && !s.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && s.date < dateFrom) return false;
    if (dateTo && s.date > dateTo) return false;
    return true;
  });

  async function handleExportExcel() {
    try {
      const allDebts = [
        ...filteredRecords.map(r => ({ tip: 'Servis', tarix: r.date, musteri: r.customer_name, umumi: r.total_price, odenilib: r.paid_amount, qaliq: r.remaining_amount })),
        ...filteredSales.map(s => ({ tip: 'Satış', tarix: s.date, musteri: s.customer_name, umumi: s.total, odenilib: s.paid_amount, qaliq: (s.total || 0) - (s.paid_amount || 0) })),
      ];
      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(allDebts, `borclar-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) {
          showNotification('Excel hazır oldu', 'success');
          window.api.showItemInFolder(result.path);
        }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(allDebts);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Borclar');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `borclar-${new Date().toISOString().split('T')[0]}.xlsx`;
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
              {fmt(records.filter(r => r.payment_status === 'gozleyir').reduce((s, r) => s + (r.remaining_amount || 0), 0))}
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
                <th>{tab === 'sales' ? 'Satış #' : 'Aktiv'}</th>
                <th>Ümumi</th>
                <th>Ödənilib</th>
                <th>Qalıq</th>
                <th>Status</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'all' || tab === 'services') && filteredRecords.map(r => (
                <tr key={`rec-${r.id}`}>
                  <td><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400"><Wrench size={10} className="inline mr-1" />Servis</span></td>
                  <td className="font-mono text-xs text-dark-300">{r.date}</td>
                  <td className="text-dark-200">{r.customer_name || '—'}</td>
                  <td className="font-medium text-white">{[r.car_brand, r.car_model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="font-semibold text-white">{fmt(r.total_price)}</td>
                  <td className="text-dark-300">{fmt(r.paid_amount)}</td>
                  <td className="font-bold text-red-400">{fmt(r.remaining_amount)}</td>
                  <td>
                    <span className={STATUS_MAP[r.payment_status]?.cls || 'status-badge bg-dark-700 text-dark-400'}>
                      {STATUS_MAP[r.payment_status]?.label || r.payment_status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openPayModal(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50 rounded-lg transition-colors">
                      <CheckCircle size={12} /> Ödəniş al
                    </button>
                  </td>
                </tr>
              ))}
              {(tab === 'all' || tab === 'sales') && filteredSales.map(s => (
                <tr key={`sale-${s.id}`}>
                  <td><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400"><ShoppingCart size={10} className="inline mr-1" />Satış</span></td>
                  <td className="font-mono text-xs text-dark-300">{s.date}</td>
                  <td className="text-dark-200">{s.customer_name || '—'}</td>
                  <td className="font-medium text-white">#{s.id}</td>
                  <td className="font-semibold text-white">{fmt(s.total)}</td>
                  <td className="text-dark-300">{fmt(s.paid_amount)}</td>
                  <td className="font-bold text-red-400">{fmt((s.total || 0) - (s.paid_amount || 0))}</td>
                  <td>
                    <span className={STATUS_MAP[s.payment_status]?.cls || 'status-badge bg-dark-700 text-dark-400'}>
                      {STATUS_MAP[s.payment_status]?.label || s.payment_status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openPayModal({ ...s, total_price: s.total, remaining_amount: (s.total || 0) - (s.paid_amount || 0), isSale: true })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50 rounded-lg transition-colors">
                      <CheckCircle size={12} /> Ödəniş al
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && filteredSales.length === 0 && (
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
                <span className="text-dark-400">Xidmət:</span>
                <span className="text-white">{payModal.service_type || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark-400">Ümumi məbləğ:</span>
                <span className="text-white font-semibold">{fmt(payModal.total_price)}</span>
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
              <label className="label">İndi alınan məbləğ (₼)</label>
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
              <label className="label">Ödəniş statusu</label>
              <select className="select-field" value={payStatus} onChange={e => setPayStatus(e.target.value)}>
                <option value="odenilib">Tamamilə ödənilib</option>
                <option value="qismen">Qismən ödənilib</option>
                <option value="borc">Borc qalır</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
