import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Loader2, Save, Phone, User, RefreshCw, X, AlertTriangle, TrendingUp, ShoppingCart, Calendar, DollarSign, Filter, FileSpreadsheet, Users, CreditCard, ArrowUpDown, FileText, Boxes, CheckCircle, Clock, Banknote, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import * as XLSX from 'xlsx';

const EMPTY_FORM = { name: '', phone: '', notes: '' };

function fmt(n) {
  if (!n) return '—';
  return `${Number(n).toFixed(2)} ₼`;
}

export default function Customers() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailRecords, setDetailRecords] = useState([]);
  const [detailSales, setDetailSales] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterDebt, setFilterDebt] = useState(false);
  const [detailTab, setDetailTab] = useState('sales');

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = window.api?.getCustomers
        ? await window.api.getCustomers(search, userId)
        : await apiRequest(`/customers${(() => {
          const params = new URLSearchParams();
          if (search) params.append('search', search);
          if (userId) params.append('userId', userId);
          const q = params.toString();
          return q ? `?${q}` : '';
        })()}`, { token: getToken() });
      if (res.success) setCustomers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, userId]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name || '', phone: c.phone || '', notes: c.notes || '' });
    setModalOpen(true);
  }

  async function openDetail(c) {
    setDetailCustomer(c);
    setDetailLoading(true);
    setDetailTab('records');
    try {
      const [recRes, salesRes] = await Promise.all([
        window.api?.getRecords
          ? window.api.getRecords({ customer_id: c.id, userId })
          : apiRequest(`/records?${new URLSearchParams({ customer_id: c.id, ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() }),
        window.api?.getSales
          ? window.api.getSales({ customer_id: c.id, userId })
          : apiRequest(`/sales?${new URLSearchParams({ customer_id: c.id, ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() }),
      ]);
      if (recRes.success) setDetailRecords(recRes.data);
      if (salesRes.success) setDetailSales(salesRes.data || []);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  }

  const [sortBy, setSortBy] = useState('total_spent');
  const [sortDir, setSortDir] = useState('desc');

  const totalDebt = customers.reduce((s, c) => s + (c.debt || 0), 0);
  const totalSpent = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
  const withDebt = customers.filter(c => (c.debt || 0) > 0).length;
  const avgSpent = customers.length > 0 ? totalSpent / customers.length : 0;

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  async function handleExportExcel() {
    try {
      const exportData = customers.map(c => ({
        Ad: c.name || '-', Telefon: c.phone || '-',
        Ziyaret: c.visit_count || 0,
        'Umumi Xevc': c.total_spent || 0,
        Borc: c.debt || 0,
        'Son Gelis': c.last_visit || '-',
      }));
      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(exportData, `musteriler-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) { showNotification('Excel hazır oldu', 'success'); window.api.showItemInFolder(result.path); }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Müştərilər');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musteriler-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification('Excel hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  const filteredCustomers = (() => {
    let arr = filterDebt ? customers.filter(c => (c.debt || 0) > 0) : customers;
    arr = [...arr].sort((a, b) => {
      const v1 = a[sortBy] || 0, v2 = b[sortBy] || 0;
      return sortDir === 'asc' ? v1 - v2 : v2 - v1;
    });
    return arr;
  })();

  async function handleSave() {
    if (!form.name && !form.phone) {
      showNotification('Ad və ya telefon daxil edin', 'error'); return;
    }
    setSaving(true);
    try {
      let result;
      if (editing) {
        result = window.api?.updateCustomer
          ? await window.api.updateCustomer(editing.id, form)
          : await apiRequest(`/customers/${editing.id}`, { method: 'PUT', token: getToken(), body: form });
      } else {
        result = window.api?.createCustomer
          ? await window.api.createCustomer({ ...form, created_by: currentUser?.id })
          : await apiRequest('/customers', { method: 'POST', token: getToken(), body: form });
      }

      if (result.success) {
        showNotification(editing ? 'Müştəri yeniləndi' : 'Müştəri əlavə edildi', 'success');
        setModalOpen(false);
        loadCustomers();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = window.api?.deleteCustomer
        ? await window.api.deleteCustomer(deleteId)
        : await apiRequest(`/customers/${deleteId}`, { method: 'DELETE', token: getToken() });
      if (result.success) {
        showNotification('Müştəri silindi', 'success');
        setDeleteId(null);
        loadCustomers();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  function toggleExpandedCustomer(id) {
    setExpandedCustomerId(prev => (prev === id ? null : id));
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Müştərilər</h1>
          <p className="text-sm text-dark-400 mt-0.5">
            {customers.length} müştəri · <span className="text-emerald-400">{fmt(totalSpent)}</span> ümumi
            {totalDebt > 0 && <> · <span className="text-red-400">{fmt(totalDebt)}</span> borc</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadCustomers} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni Müştəri
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Cəmi Müştəri</p>
            <Users size={14} className="text-primary-400" />
          </div>
          <p className="text-2xl font-black text-white">{customers.length}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">qeydiyyatlı</p>
        </div>
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ümumi Xərc</p>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{Number(totalSpent).toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">₼ məcmu</p>
        </div>
        <div className={`card p-4 ${withDebt > 0 ? 'border border-red-800/30 bg-red-900/10' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Borclu</p>
            <CreditCard size={14} className={withDebt > 0 ? 'text-red-400' : 'text-dark-600'} />
          </div>
          <p className={`text-2xl font-black ${withDebt > 0 ? 'text-red-400' : 'text-dark-600'}`}>{withDebt}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{Number(totalDebt).toFixed(2)} ₼ borc</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ort. Xərc</p>
            <DollarSign size={14} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{Number(avgSpent).toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">₼ / müştəri</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Ad, telefon ilə axtar..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setFilterDebt(!filterDebt)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all
            ${filterDebt ? 'bg-red-900/30 text-red-400 border border-red-700/50' : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'}`}>
          <AlertTriangle size={13} />
          Borclu
        </button>
        <div className="flex bg-dark-800 rounded-xl p-1 gap-1">
          {[['total_spent', 'Xərc'], ['visit_count', 'Ziyarət'], ['debt', 'Borc']].map(([key, label]) => (
            <button key={key} onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sortBy === key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
              {label} {sortBy === key && <ArrowUpDown size={9} />}
            </button>
          ))}
        </div>
        <button onClick={handleExportExcel} className="btn-secondary text-xs h-9">
          <FileSpreadsheet size={13} /> Excel
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-dark-800 text-dark-300">{filteredCustomers.length} nəticə</span>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Ziyarət</th>
                <th>Ümumi xərc</th>
                <th>Borc</th>
                <th>Son gəliş</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <div className="empty-state">
                    <User size={32} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Müştəri tapılmadı</p>
                  </div>
                </td></tr>
              ) : filteredCustomers.map((c, i) => {
                const hasDebt = (c.debt || 0) > 0;
                return (
                  <React.Fragment key={c.id}>
                    <tr className={`cursor-pointer ${hasDebt ? 'bg-red-900/5' : ''}`} onClick={() => openDetail(c)}>
                      <td className="text-dark-500">{i + 1}</td>
                      <td className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                            ${hasDebt ? 'bg-red-900/40 border border-red-800/40 text-red-400' : 'bg-primary-900/40 border border-primary-800/40 text-primary-400'}`}>
                            {(c.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExpandedCustomer(c.id); }}
                              className="text-left hover:underline"
                            >
                              {c.name || '—'}
                            </button>
                            {c.phone && <p className="text-[10px] text-dark-500 font-mono">{c.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-dark-300 font-mono text-xs">{c.phone || '—'}</td>
                      <td className="text-dark-300">{c.visit_count || 0}</td>
                      <td className="font-semibold text-emerald-400">{fmt(c.total_spent)}</td>
                      <td className={`font-semibold ${hasDebt ? 'text-red-400' : 'text-dark-600'}`}>
                        {hasDebt ? fmt(c.debt) : '—'}
                      </td>
                      <td className="text-dark-400 text-xs">{c.last_visit || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(c)} className="btn-icon w-7 h-7"><Edit3 size={13} /></button>
                          <button onClick={() => setDeleteId(c.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>

                    {expandedCustomerId === c.id && (
                      <tr onClick={(e) => e.stopPropagation()} className={hasDebt ? 'bg-red-900/5' : ''}>
                        <td colSpan={8} className="py-3">
                          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4">
                            <p className="text-xs font-semibold text-dark-400 mb-1">Açıqlama</p>
                            <p className="text-sm text-white whitespace-pre-wrap">{c.notes ? c.notes : 'Açıqlama yoxdur'}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
              );})}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Müştərini Redaktə Et' : 'Yeni Müştəri'} size="sm"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Ləğv et</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Yadda saxla
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div><label className="label">Ad Soyad</label><input className="input-field" placeholder="Elvin Məmmədov" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Telefon</label><input className="input-field" placeholder="050-123-4567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><label className="label">Qeyd</label><textarea className="input-field resize-none h-20" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      <Modal open={!!detailCustomer} onClose={() => setDetailCustomer(null)} title="" size="lg">
        {detailCustomer && (() => {
          const METHOD_LABEL = { cash: 'Nağd', card: 'Kart', transfer: 'Köçürmə', debt: 'Borc', partial: 'Qismən' };
          const STATUS_STYLE = {
            odenilib: { cls: 'text-emerald-400 bg-emerald-900/20', label: 'Ödənilib', Icon: CheckCircle },
            qismen:   { cls: 'text-amber-400 bg-amber-900/20',   label: 'Qismən',   Icon: Clock },
            gozleyir: { cls: 'text-blue-400 bg-blue-900/20',     label: 'Gözləyir', Icon: Clock },
            borc:     { cls: 'text-red-400 bg-red-900/20',       label: 'Borc',     Icon: AlertCircle },
          };
          const hasDebt = (detailCustomer.debt || 0) > 0;
          const totalSales = detailSales.reduce((s, x) => s + (x.total || 0), 0);
          const totalRec   = detailRecords.reduce((s, x) => s + (x.total_price || 0), 0);
          return (
            <div className="space-y-5">

              {/* Profile header */}
              <div className="flex items-center gap-4 pb-4 border-b border-dark-700">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0
                  ${hasDebt ? 'bg-red-900/40 border border-red-800/40 text-red-400' : 'bg-primary-900/40 border border-primary-800/40 text-primary-400'}`}>
                  {(detailCustomer.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{detailCustomer.name || '—'}</h2>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {detailCustomer.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-dark-300">
                        <Phone size={12} className="text-dark-500" />{detailCustomer.phone}
                      </span>
                    )}
                    {detailCustomer.last_visit && (
                      <span className="flex items-center gap-1.5 text-xs text-dark-400">
                        <Calendar size={11} className="text-dark-500" />Son gəliş: {detailCustomer.last_visit}
                      </span>
                    )}
                  </div>
                  {detailCustomer.notes && (
                    <div className="mt-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2">
                      <p className="text-xs text-dark-400 mb-0.5">Açıqlama / Qeyd</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{detailCustomer.notes}</p>
                    </div>
                  )}
                </div>
                <button onClick={() => openEdit(detailCustomer)} className="btn-secondary text-xs py-1.5 shrink-0">
                  <Edit3 size={12} /> Redaktə
                </button>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3">
                <div className="card p-3 text-center">
                  <p className="text-2xl font-black text-primary-400">{detailCustomer.visit_count || 0}</p>
                  <p className="text-[10px] text-dark-400 mt-0.5">Ziyarət</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-lg font-black text-emerald-400">{fmt(detailCustomer.total_spent)}</p>
                  <p className="text-[10px] text-dark-400 mt-0.5">Ümumi xərc</p>
                </div>
                <div className={`card p-3 text-center ${hasDebt ? 'border border-red-800/40 bg-red-900/10' : ''}`}>
                  <p className={`text-lg font-black ${hasDebt ? 'text-red-400' : 'text-dark-600'}`}>
                    {hasDebt ? fmt(detailCustomer.debt) : '—'}
                  </p>
                  <p className="text-[10px] text-dark-400 mt-0.5">Borc</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-lg font-black text-white">{detailRecords.length + detailSales.length}</p>
                  <p className="text-[10px] text-dark-400 mt-0.5">Toplam qeyd</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-dark-700 pt-4">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setDetailTab('records')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${detailTab === 'records' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-dark-400 hover:text-white bg-dark-800'}`}>
                    <FileText size={12} /> Servis qeydləri ({detailRecords.length}) · {fmt(totalRec)}
                  </button>
                  <button onClick={() => setDetailTab('sales')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${detailTab === 'sales' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-dark-400 hover:text-white bg-dark-800'}`}>
                    <ShoppingCart size={12} /> Satışlar ({detailSales.length}) · {fmt(totalSales)}
                  </button>
                </div>

                {detailLoading ? (
                  <div className="flex justify-center py-8"><div className="loading-spinner w-6 h-6" /></div>

                ) : detailTab === 'records' ? (
                  detailRecords.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText size={32} className="mx-auto mb-2 text-dark-700" />
                      <p className="text-dark-500 text-sm">Servis qeydi yoxdur</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-auto pr-1">
                      {detailRecords.map(r => {
                        const st = STATUS_STYLE[r.payment_status] || STATUS_STYLE.gozleyir;
                        const remaining = (r.total_price || 0) - (r.paid_amount || 0);
                        return (
                          <div key={r.id} className="bg-dark-800 border border-dark-700 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-dark-400 font-mono">{r.date}{r.time ? ' ' + r.time : ''}</span>
                                  {(r.car_brand || r.car_model || r.car_plate) && (
                                    <span className="flex items-center gap-1 text-xs text-dark-300">
                                      <Boxes size={10} className="text-dark-500" />
                                      {[r.car_brand, r.car_model].filter(Boolean).join(' ')}
                                      {r.car_plate && <span className="font-mono text-amber-400 ml-1">{r.car_plate}</span>}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-white mt-1">{r.service_type || '—'}</p>
                                {r.extra_services && <p className="text-xs text-dark-400 mt-0.5">{r.extra_services}</p>}
                                {r.notes && <p className="text-xs text-dark-500 mt-0.5 italic">{r.notes}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-white">{fmt(r.total_price)}</p>
                                {(r.paid_amount || 0) > 0 && r.payment_status !== 'odenilib' && (
                                  <p className="text-xs text-emerald-400">{fmt(r.paid_amount)} ödənilib</p>
                                )}
                                {remaining > 0.005 && (
                                  <p className="text-xs text-red-400">{fmt(remaining)} qalır</p>
                                )}
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md mt-1 ${st.cls}`}>
                                  <st.Icon size={9} />{st.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )

                ) : (
                  detailSales.length === 0 ? (
                    <div className="text-center py-10">
                      <ShoppingCart size={32} className="mx-auto mb-2 text-dark-700" />
                      <p className="text-dark-500 text-sm">Satış yoxdur</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-auto pr-1">
                      {detailSales.map(s => {
                        const st = STATUS_STYLE[s.payment_status] || STATUS_STYLE.gozleyir;
                        const debt = (s.total || 0) - (s.paid_amount || 0);
                        return (
                          <div key={s.id} className="bg-dark-800 border border-dark-700 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-dark-400 font-mono">{s.date}{s.time ? ' ' + s.time : ''}</span>
                                  <span className="flex items-center gap-1 text-xs text-dark-400">
                                    <Banknote size={10} className="text-dark-500" />
                                    {METHOD_LABEL[s.payment_method] || s.payment_method || 'Nağd'}
                                  </span>
                                  <span className="text-xs text-dark-500">{s.item_count || 0} məhsul</span>
                                </div>
                                {s.notes && <p className="text-xs text-dark-500 mt-1 italic">{s.notes}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-white">{fmt(s.total)}</p>
                                {(s.paid_amount || 0) > 0 && s.payment_status !== 'odenilib' && (
                                  <p className="text-xs text-emerald-400">{fmt(s.paid_amount)} ödənilib</p>
                                )}
                                {debt > 0.005 && (
                                  <p className="text-xs text-red-400">{fmt(debt)} borc</p>
                                )}
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md mt-1 ${st.cls}`}>
                                  <st.Icon size={9} />{st.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Müştərini Sil" message="Bu müştərini silmək istədiyinizə əminsiniz?" loading={deleteLoading} />
    </div>
  );
}
