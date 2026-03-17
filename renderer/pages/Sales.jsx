import React, { useState, useEffect, useCallback } from 'react';
import useDebounce from '../hooks/useDebounce';
import { Search, Plus, Trash2, RefreshCw, ShoppingCart, CheckCircle, Loader2, Eye, FileText, Banknote, CreditCard, ArrowLeftRight, UserX, ChevronDown, Calendar, Filter, X as XIcon, FileSpreadsheet, TrendingUp, TrendingDown, Users, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { getCurrencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function getStatusMap(t) {
  return {
    odenilib: { label: t('statusPaid'), cls: 'status-odenilib' },
    gozleyir: { label: t('statusWaiting'), cls: 'status-gozleyir' },
    qismen:   { label: t('statusPartial'),   cls: 'status-qismen' },
    borc:     { label: t('statusDebt'),     cls: 'status-borc' },
  };
}

function getMethodMap(t) {
  return {
    cash:     { label: t('cash'),     cls: 'bg-emerald-500/15 text-emerald-400', Icon: Banknote },
    card:     { label: t('card'),     cls: 'bg-blue-500/15 text-blue-400',    Icon: CreditCard },
    transfer: { label: t('transfer'), cls: 'bg-violet-500/15 text-violet-400', Icon: ArrowLeftRight },
    debt:     { label: t('statusDebt'),    cls: 'bg-red-500/15 text-red-400',      Icon: UserX },
    partial:  { label: t('statusPartial'),  cls: 'bg-amber-500/15 text-amber-400',  Icon: ChevronDown },
  };
}

function MethodBadge({ method, METHOD_MAP }) {
  const m = (METHOD_MAP || {})[method] || { label: method || '—', cls: 'bg-dark-700 text-dark-400', Icon: Banknote };
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)}`;
}

export default function Sales() {
  const navigate = useNavigate();
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const STATUS_MAP = getStatusMap(t);
  const METHOD_MAP = getMethodMap(t);
  const userId = isAdmin ? undefined : currentUser?.id;
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 280);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailSale, setDetailSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [receiptLoadingIds, setReceiptLoadingIds] = useState(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (userId) params.userId = userId;
      const res = window.api?.getSales
        ? await window.api.getSales(params)
        : await apiRequest(`/sales?${new URLSearchParams(params).toString()}`, { token: getToken() });
      if (res.success) setSales(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [debouncedSearch, dateFrom, dateTo, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function openDetail(sale) {
    setDetailLoading(true);
    setDetailSale({ ...sale, items: [] });
    try {
      const res = window.api?.getSale
        ? await window.api.getSale(sale.id)
        : await apiRequest(`/sales/${sale.id}`, { token: getToken() });
      if (res.success) setDetailSale(res.data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = window.api?.deleteSale
        ? await window.api.deleteSale(deleteId)
        : await apiRequest(`/sales/${deleteId}`, { method: 'DELETE', token: getToken() });
      if (result.success) {
        showNotification('Satış silindi', 'success');
        setDeleteId(null);
        loadData();
      } else { showNotification(result.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  async function downloadReceiptPdf(sale) {
    let fullSale = sale;
    if (!fullSale?.items || fullSale.items.length === 0) {
      const res = await apiRequest(`/sales/${sale.id}`, { token: getToken() });
      if (res.success) fullSale = res.data;
    }

    const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14);
    doc.text(`Satış #${fullSale.id}`, 14, 14);
    doc.setFontSize(10);
    doc.text(`Tarix: ${fullSale.date || ''} ${fullSale.time || ''}`.trim(), 14, 20);
    if (fullSale.customer_name) doc.text(`Müştəri: ${fullSale.customer_name}`, 14, 25);

    const rows = (fullSale.items || []).map(it => ([
      it.product_name || '-',
      String(it.qty ?? ''),
      String(it.unit_price ?? ''),
      String(it.total ?? ''),
    ]));

    autoTable(doc, {
      startY: 30,
      head: [['Məhsul', 'Miqdar', 'Qiymət', 'Cəm']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    const y = (doc.lastAutoTable?.finalY || 30) + 10;
    doc.setFontSize(10);
    doc.text(`Ümumi: ${fmt(fullSale.total)}`, 14, y);
    doc.text(`Ödənilib: ${fmt(fullSale.paid_amount)}`, 14, y + 5);
    doc.text(`Status: ${fullSale.payment_status || ''}`, 14, y + 10);
    doc.save(`satis-${fullSale.id}.pdf`);
  }

  async function handleReceipt(sale) {
    setReceiptLoadingIds(s => new Set([...s, sale.id]));
    try {
      if (window.api?.generateSaleReceipt) {
        const res = await window.api.generateSaleReceipt(sale.id);
        if (res.success) {
          showNotification('Qəbz PDF hazır oldu', 'success');
          window.api.showItemInFolder(res.path);
        } else showNotification(res.error || 'Xəta', 'error');
      } else {
        await downloadReceiptPdf(sale);
        showNotification('Qəbz PDF hazır oldu', 'success');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setReceiptLoadingIds(s => { const n = new Set(s); n.delete(sale.id); return n; }); }
  }

  async function handlePay() {
    setPaying(true);
    try {
      const amount = parseFloat(payAmount) || 0;
      const total = payModal.total || 0;
      const prevPaid = payModal.paid_amount || 0;
      const newPaid = prevPaid + amount;
      const status = newPaid >= total ? 'odenilib' : newPaid > 0 ? 'qismen' : 'gozleyir';
      const result = window.api?.updateSalePayment
        ? await window.api.updateSalePayment(payModal.id, newPaid, status)
        : await apiRequest(`/sales/${payModal.id}/payment`, {
          method: 'PUT',
          token: getToken(),
          body: { paid_amount: newPaid, payment_status: status },
        });
      if (result.success) {
        showNotification('Ödəniş qeyd edildi', 'success');
        setPayModal(null);
        loadData();
      } else { showNotification(result.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setPaying(false); }
  }

  const filteredSales = methodFilter ? sales.filter(s => s.payment_method === methodFilter) : sales;
  const totalRevenue = filteredSales.reduce((s, sale) => s + (sale.total || 0), 0);
  const totalPaid = filteredSales.reduce((s, sale) => s + (sale.paid_amount || 0), 0);
  const totalDebt = totalRevenue - totalPaid;
  const uniqueCustomers = new Set(filteredSales.filter(s => s.customer_id).map(s => s.customer_id)).size;
  const avgSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Build last-7-days chart data
  const trendData = (() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      days[key] = { date: label, revenue: 0, count: 0 };
    }
    filteredSales.forEach(s => {
      const d = (s.date || '').split('T')[0];
      if (days[d]) { days[d].revenue += s.total || 0; days[d].count += 1; }
    });
    return Object.values(days);
  })();

  async function handleExportExcel() {
    try {
      const exportData = filteredSales.map(s => ({
        id: s.id, date: s.date, time: s.time, customer_name: s.customer_name || '-',
        total: s.total, paid_amount: s.paid_amount, debt: (s.total || 0) - (s.paid_amount || 0),
        payment_method: METHOD_MAP[s.payment_method]?.label || s.payment_method,
        payment_status: STATUS_MAP[s.payment_status]?.label || s.payment_status,
      }));
      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(exportData, `satislar-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) {
          showNotification('Excel hazır oldu', 'success');
          window.api.showItemInFolder(result.path);
        }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Satışlar');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `satislar-${new Date().toISOString().split('T')[0]}.xlsx`;
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
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={20} className="text-primary-400" /> Satışlar</h1>
          <p className="text-sm text-dark-400 mt-0.5">{filteredSales.length} qeyd · Son 7 gün trendi aşağıda</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-xs py-1.5" title="Excel Export">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/pos')} className="btn-secondary text-xs py-1.5">
            <ShoppingCart size={13} /> POS
          </button>
          <button onClick={() => navigate('/sales/new')} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni Satış
          </button>
        </div>
      </div>

      {/* KPI Cards + Chart */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ümumi Gəlir</p>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{fmt(totalRevenue)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{csym} məcmu</p>
        </div>
        <div className="card p-4 border border-blue-800/30 bg-blue-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ödənilən</p>
            <CheckCircle size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{fmt(totalPaid)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{totalRevenue > 0 ? ((totalPaid/totalRevenue)*100).toFixed(0) : 0}% ödənilib</p>
        </div>
        <div className="card p-4 border border-red-800/30 bg-red-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Qalıq Borc</p>
            <TrendingDown size={14} className="text-red-400" />
          </div>
          <p className={`text-2xl font-black ${totalDebt > 0 ? 'text-red-400' : 'text-dark-600'}`}>{fmt(totalDebt)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{filteredSales.filter(s => (s.total - (s.paid_amount||0)) > 0).length} satış</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Müştəri</p>
            <Users size={14} className="text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">{uniqueCustomers}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">fərqli müştəri</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ort. Satış</p>
            <BarChart2 size={14} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{fmt(avgSale)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{csym} / satış</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-dark-400 uppercase mb-3 flex items-center gap-2">
          <BarChart2 size={12} className="text-primary-400" /> Son 7 Günün Gəlir Trendi
        </p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
              formatter={(v) => [`${Number(v).toFixed(2)} ${csym}`, 'Gəlir']} />
            <Bar dataKey="revenue" fill="#10b981" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-8 h-8 text-xs w-44" placeholder="Müştəri..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 bg-dark-800 border border-dark-700 rounded-xl px-2 h-8">
          <Calendar size={12} className="text-dark-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none w-28" />
          <span className="text-dark-600 text-xs">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none w-28" />
        </div>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 h-8 text-xs text-white focus:outline-none">
          <option value="">Ödəniş üsuluна görə</option>
          <option value="cash">Nağd</option>
          <option value="card">Kart</option>
          <option value="transfer">Köçürmə</option>
          <option value="debt">Borc</option>
          <option value="partial">Qismən</option>
        </select>
        {(dateFrom || dateTo || methodFilter || search) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setMethodFilter(''); setSearch(''); }}
            className="flex items-center gap-1 px-2 h-8 rounded-xl bg-red-900/20 text-red-400 text-xs hover:bg-red-900/40 transition-colors">
            <XIcon size={12} /> Sıfırla
          </button>
        )}

        {/* Summary badges */}
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-dark-800 text-dark-300">{filteredSales.length} qeyd</span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/30 text-emerald-400">{fmt(totalPaid)} ödənilib</span>
          {totalDebt > 0 && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-900/30 text-red-400">{fmt(totalDebt)} borc</span>}
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Tarix</th><th>Müştəri</th><th>Məhsul</th>
                <th>Ümumi</th><th>Ödənilib</th><th>Borc</th><th>Üsul</th><th>Status</th><th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16">
                  <div className="empty-state">
                    <ShoppingCart size={36} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Satış tapılmadı</p>
                  </div>
                </td></tr>
              ) : filteredSales.map((sale, i) => (
                <tr key={sale.id}>
                  <td className="text-dark-500 font-mono text-xs">#{sale.id}</td>
                  <td className="font-mono text-xs text-dark-300">{sale.date} {sale.time}</td>
                  <td className="text-dark-200">{sale.customer_name || '—'}</td>
                  <td className="text-dark-300">{sale.item_count ?? '—'}</td>
                  <td className="font-bold text-white">{fmt(sale.total)}</td>
                  <td className="text-emerald-400">{fmt(sale.paid_amount)}</td>
                  <td className={`text-xs font-semibold ${ (sale.total - (sale.paid_amount||0)) > 0 ? 'text-red-400' : 'text-dark-600' }`}>
                    { (sale.total - (sale.paid_amount||0)) > 0 ? fmt(sale.total - (sale.paid_amount||0)) : '—' }
                  </td>
                  <td><MethodBadge method={sale.payment_method} METHOD_MAP={METHOD_MAP} /></td>
                  <td>
                    <span className={STATUS_MAP[sale.payment_status]?.cls || 'status-badge bg-dark-700 text-dark-400'}>
                      {STATUS_MAP[sale.payment_status]?.label || sale.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(sale)} className="btn-icon w-7 h-7" title="Bax">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleReceipt(sale)} disabled={receiptLoadingIds.has(sale.id)}
                        className="btn-icon w-7 h-7 hover:bg-blue-900/30 hover:text-blue-400" title="Qəbz PDF">
                        {receiptLoadingIds.has(sale.id) ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                      </button>
                      {sale.payment_status !== 'odenilib' && (
                        <button onClick={() => { setPayModal(sale); setPayAmount(String(sale.total - (sale.paid_amount || 0))); }}
                          className="btn-icon w-7 h-7 hover:bg-emerald-900/30 hover:text-emerald-400" title="Ödəniş al">
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button onClick={() => setDeleteId(sale.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!detailSale} onClose={() => setDetailSale(null)}
        title={`Satış #${detailSale?.id} — ${detailSale?.date || ''}`} size="md"
        footer={
          <button onClick={() => detailSale && handleReceipt(detailSale)} disabled={detailSale && receiptLoadingIds.has(detailSale.id)} className="btn-secondary text-xs py-1.5">
            {detailSale && receiptLoadingIds.has(detailSale.id) ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Qəbz PDF Çap et
          </button>
        }>
        {detailSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-white">{fmt(detailSale.total)}</p>
                <p className="text-xs text-dark-400 mt-0.5">Ümumi məbləğ</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{fmt(detailSale.paid_amount)}</p>
                <p className="text-xs text-dark-400 mt-0.5">Ödənilən</p>
              </div>
              <div className="card p-3 text-center">
                <MethodBadge method={detailSale.payment_method} METHOD_MAP={METHOD_MAP} />
                <p className="text-xs text-dark-400 mt-1">Ödəniş üsulu</p>
              </div>
              <div className="card p-3 text-center">
                <span className={STATUS_MAP[detailSale.payment_status]?.cls || 'status-badge'}>
                  {STATUS_MAP[detailSale.payment_status]?.label || detailSale.payment_status}
                </span>
                <p className="text-xs text-dark-400 mt-1">Status</p>
              </div>
            </div>
            {detailSale.customer_name && (
              <p className="text-sm text-dark-300">Müştəri: <span className="text-white font-medium">{detailSale.customer_name}</span></p>
            )}
            <div className="border-t border-dark-700 pt-3">
              <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Məhsullar</p>
              {detailLoading ? (
                <div className="flex justify-center py-4"><div className="loading-spinner w-5 h-5" /></div>
              ) : (
                <table className="data-table text-xs">
                  <thead><tr><th>Məhsul</th><th>Miqdar</th><th>Qiymət</th><th>Cəm</th></tr></thead>
                  <tbody>
                    {(detailSale.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="text-white">{item.product_name}</td>
                        <td className="text-dark-300">{item.qty}</td>
                        <td className="text-dark-300">{fmt(item.unit_price)}</td>
                        <td className="text-emerald-400 font-semibold">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {detailSale.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Endirim:</span>
                <span className="text-red-400">-{fmt(detailSale.discount)}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Ödəniş Qeyd Et" size="sm"
        footer={
          <>
            <button onClick={() => setPayModal(null)} className="btn-secondary">Ləğv et</button>
            <button onClick={handlePay} disabled={paying} className="btn-success">
              {paying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Təsdiqlə
            </button>
          </>
        }
      >
        {payModal && (
          <div className="space-y-4">
            <div className="card p-3 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-dark-400">Ümumi:</span><span className="text-white font-bold">{fmt(payModal.total)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-dark-400">Ödənilən:</span><span className="text-emerald-400">{fmt(payModal.paid_amount)}</span></div>
              <div className="flex justify-between text-xs border-t border-dark-700 pt-1 mt-1"><span className="text-dark-300">Qalıq:</span><span className="text-red-400 font-bold">{fmt((payModal.total || 0) - (payModal.paid_amount || 0))}</span></div>
            </div>
            <div>
              <label className="label">Alınan məbləğ ({csym})</label>
              <input type="number" min="0" step="0.01" className="input-field" value={payAmount}
                onChange={e => setPayAmount(e.target.value)} autoFocus />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Satışı Sil" message="Bu satışı silmək istədiyinizə əminsiniz? Satılan məhsulların stoku geri qaytarılacaq." loading={deleteLoading} />
    </div>
  );
}
