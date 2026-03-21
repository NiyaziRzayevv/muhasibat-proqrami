import React, { useState, useEffect, useCallback } from 'react';
import useDebounce from '../hooks/useDebounce';
import {
  Search, Filter, Plus, Trash2, Edit3, ChevronUp, ChevronDown,
  RefreshCw, Download, CheckSquare, Square, Loader2, Save, X,
  FileText, FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { getCurrencySymbol } from '../utils/currency';
import { apiBridge } from '../api/bridge';
import { apiRequest } from '../api/http';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function getPaymentStatusOptions(t) {
  return [
    { value: '', label: t('all') },
    { value: 'odenilib', label: t('statusPaid') },
    { value: 'gozleyir', label: t('statusWaiting') },
    { value: 'qismen', label: t('statusPartial') },
    { value: 'borc', label: t('statusDebt') },
  ];
}

function getStatusMap(t) {
  return {
    odenilib: { label: t('statusPaid'), cls: 'status-odenilib' },
    gozleyir: { label: t('statusWaiting'), cls: 'status-gozleyir' },
    qismen: { label: t('statusPartial'), cls: 'status-qismen' },
    borc: { label: t('statusDebt'), cls: 'status-borc' },
  };
}

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return `${Number(n).toFixed(2)}`;
}

const EDIT_EMPTY = {
  date: '', time: '', customer_name: '', customer_phone: '',
  car_brand: '', car_model: '', car_plate: '',
  service_type: '', extra_services: '',
  quantity: 1, unit_price: '', total_price: '',
  payment_status: 'gozleyir', paid_amount: '', notes: '',
};

export default function Records() {
  const navigate = useNavigate();
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const PAYMENT_STATUS_OPTIONS = getPaymentStatusOptions(t);
  const STATUS_MAP = getStatusMap(t);
  const userId = isAdmin ? undefined : currentUser?.id;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 280);
  const [filters, setFilters] = useState({ paymentStatus: '', startDate: '', endDate: '', brand: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [orderBy, setOrderBy] = useState('date');
  const [orderDir, setOrderDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [totalAmount, setTotalAmount] = useState(0);

  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({ ...EDIT_EMPTY });
  const [editSaving, setEditSaving] = useState(false);

  const [customerModal, setCustomerModal] = useState({ open: false, loading: false, customer: null, vehicles: [] });
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [deleteId, setDeleteId] = useState(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiBridge.getRecords({
        search: debouncedSearch || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        brand: filters.brand || undefined,
        orderBy, orderDir,
        userId,
      });
      if (res.success) {
        setRecords(res.data);
        setTotalAmount(res.data.reduce((s, r) => s + (r.total_price || 0), 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, orderBy, orderDir, userId]);

  async function openCustomerDetail(r) {
    setSelectedRecord(r);
    setCustomerModal(cm => ({ ...cm, open: true, loading: true }));
    try {
      let customer = null;
      if (r.customer_id) {
        const res = await apiBridge.getCustomer(r.customer_id);
        if (res.success) customer = res.data;
      }
      if (!customer) {
        customer = {
          id: null,
          name: r.customer_name || 'Müştəri',
          phone: r.customer_phone || '',
        };
      }
      let vehicles = [];
      const vehRes = await apiBridge.getVehicles('', userId);
      vehicles = vehRes.success ? (vehRes.data || []).filter(v => v.customer_id === customer.id) : [];
      setCustomerModal({ open: true, loading: false, customer, vehicles });
    } catch (e) {
      console.error(e);
      setCustomerModal({ open: true, loading: false, customer: null, vehicles: [] });
    }
  }

  useEffect(() => { loadRecords(); }, [loadRecords]);

  function toggleSort(col) {
    if (orderBy === col) setOrderDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(col); setOrderDir('desc'); }
  }

  function SortIcon({ col }) {
    if (orderBy !== col) return <ChevronDown size={12} className="text-dark-600" />;
    return orderDir === 'asc' ? <ChevronUp size={12} className="text-primary-400" /> : <ChevronDown size={12} className="text-primary-400" />;
  }

  function toggleSelect(id) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map(r => r.id)));
  }

  const selectedTotal = records.filter(r => selected.has(r.id)).reduce((s, r) => s + (r.total_price || 0), 0);

  function openEdit(record) {
    setEditRecord(record);
    setEditForm({
      date: record.date || '',
      time: record.time || '',
      customer_name: record.customer_name || '',
      customer_phone: record.customer_phone || '',
      car_brand: record.car_brand || '',
      car_model: record.car_model || '',
      car_plate: record.car_plate || '',
      service_type: record.service_type || '',
      extra_services: record.extra_services || '',
      quantity: record.quantity || 1,
      unit_price: record.unit_price || '',
      total_price: record.total_price || '',
      payment_status: record.payment_status || 'gozleyir',
      paid_amount: record.paid_amount || '',
      notes: record.notes || '',
    });
  }

  function setEditField(k, v) {
    setEditForm(f => {
      const updated = { ...f, [k]: v };
      if (k === 'unit_price' || k === 'quantity') {
        const u = parseFloat(k === 'unit_price' ? v : f.unit_price) || 0;
        const q = parseFloat(k === 'quantity' ? v : f.quantity) || 1;
        updated.total_price = (u * q).toFixed(2);
      }
      if (k === 'payment_status' && v === 'odenilib') {
        updated.paid_amount = updated.total_price;
      }
      return updated;
    });
  }

  async function handleEditSave() {
    setEditSaving(true);
    try {
      const totalPrice = parseFloat(editForm.total_price) || null;
      const paidAmount = editForm.payment_status === 'odenilib' ? totalPrice : (parseFloat(editForm.paid_amount) || 0);
      const remainingAmount = totalPrice !== null ? Math.max(0, totalPrice - paidAmount) : null;
      const result = await apiBridge.updateRecord(editRecord.id, {
        ...editForm,
        unit_price: parseFloat(editForm.unit_price) || null,
        total_price: totalPrice,
        quantity: parseFloat(editForm.quantity) || 1,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
      });
      if (result.success) {
        showNotification('Qeyd yeniləndi', 'success');
        setEditRecord(null);
        loadRecords();
      } else {
        showNotification(result.error || 'Xəta baş verdi', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = await apiBridge.deleteRecord(deleteId);
      if (result.success) {
        showNotification('Qeyd silindi', 'success');
        setDeleteId(null);
        loadRecords();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleBulkDelete() {
    setDeletingBulk(true);
    try {
      const result = await apiBridge.deleteMultipleRecords([...selected]);
      if (result.success) {
        showNotification(`${selected.size} qeyd silindi`, 'success');
        setSelected(new Set());
        setShowBulkDelete(false);
        loadRecords();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setDeletingBulk(false);
    }
  }

  async function handleExportExcel() {
    try {
      const toExport = selected.size > 0 ? records.filter(r => selected.has(r.id)) : records;
      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(toExport);
        if (result.success) {
          showNotification('Excel faylı hazır oldu', 'success');
          window.api.showItemInFolder(result.path);
        }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(toExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Qeydlər');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qeydler-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification('Excel faylı hazır oldu', 'success');
    } catch (e) {
      showNotification('Export xətası: ' + e.message, 'error');
    }
  }

  async function handleExportPdf() {
    try {
      const toExport = selected.size > 0 ? records.filter(r => selected.has(r.id)) : records;
      if (window.api?.exportPdf && window.api?.getSettings) {
        const settings = await window.api.getSettings();
        const result = await window.api.exportPdf(toExport, {
          companyName: settings.data?.company_name || 'Əməliyyat Qeydləri'
        });
        if (result.success) {
          showNotification('PDF faylı hazır oldu', 'success');
          window.api.showItemInFolder(result.path);
        }
        return;
      }

      // Browser/remote mode: generate PDF client-side
      let title = 'Əməliyyat Qeydləri';
      try {
        const token = localStorage.getItem('auth_token') || '';
        const s = await apiRequest('/settings', { token });
        if (s.success && s.data?.company_name) title = s.data.company_name;
      } catch {}

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(12);
      doc.text(title, 14, 12);
      doc.setFontSize(10);
      doc.text(`Tarix: ${new Date().toISOString().split('T')[0]}`, 14, 18);

      autoTable(doc, {
        startY: 24,
        head: [[
          'Tarix', 'Aktiv', 'Müştəri', 'Xidmət', 'Yekun', 'Ödənilib', 'Status'
        ]],
        body: toExport.map(r => ([
          r.date || '',
          [r.car_brand, r.car_model].filter(Boolean).join(' ') || '—',
          r.customer_name || '—',
          r.service_type || '—',
          Number(r.total_price || 0).toFixed(2),
          Number(r.paid_amount || 0).toFixed(2),
          r.payment_status || '—',
        ])),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
      });

      doc.save(`qeydler-${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('PDF faylı hazır oldu', 'success');
    } catch (e) {
      showNotification('PDF xətası: ' + e.message, 'error');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bütün Qeydlər</h1>
          <p className="text-sm text-dark-400 mt-0.5">{records.length} qeyd tapıldı · Cəm: <span className="text-emerald-400 font-medium">{fmt(totalAmount)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-dark-400 px-2">{selected.size} seçildi · {fmt(selectedTotal)}</span>
              <button onClick={() => setShowBulkDelete(true)} className="btn-danger text-xs py-1.5">
                <Trash2 size={13} /> {selected.size} Sil
              </button>
            </>
          )}
          <button onClick={handleExportExcel} className="btn-secondary text-xs py-1.5" title="Excel Export">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={handleExportPdf} className="btn-secondary text-xs py-1.5" title="PDF Export">
            <FileText size={13} /> PDF
          </button>
          <button onClick={loadRecords} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/new-record')} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Axtarış: kateqoriya, müştəri, xidmət..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-xs py-2 ${showFilters ? 'border-primary-500 text-primary-400' : ''}`}>
          <Filter size={13} /> Filter {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          <div>
            <label className="label text-xs">Başlanğıc tarixi</label>
            <input type="date" className="input-field text-xs h-8" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">Son tarix</label>
            <input type="date" className="input-field text-xs h-8" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">Kateqoriya / Növ</label>
            <input className="input-field text-xs h-8" placeholder="Telefon, Masin..." value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">Ödəniş statusu</label>
            <select className="select-field text-xs h-8" value={filters.paymentStatus} onChange={e => setFilters(f => ({ ...f, paymentStatus: e.target.value }))}>
              {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilters({ paymentStatus: '', startDate: '', endDate: '', brand: '' }); setSearch(''); }}
            className="btn-secondary text-xs h-8 col-span-2 sm:col-span-1">
            <X size={12} /> Filtri sıfırla
          </button>
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
                <th className="w-10">
                  <button onClick={toggleSelectAll} className="text-dark-400 hover:text-white">
                    {selected.size === records.length && records.length > 0 ? <CheckSquare size={15} className="text-primary-400" /> : <Square size={15} />}
                  </button>
                </th>
                <th onClick={() => toggleSort('date')} className="cursor-pointer">
                  <span className="flex items-center gap-1">Tarix <SortIcon col="date" /></span>
                </th>
                <th>Saat</th>
                <th onClick={() => toggleSort('car_brand')} className="cursor-pointer">
                  <span className="flex items-center gap-1">Əşya / Aktiv <SortIcon col="car_brand" /></span>
                </th>
                <th>Kod</th>
                <th onClick={() => toggleSort('customer_name')} className="cursor-pointer">
                  <span className="flex items-center gap-1">Müştəri <SortIcon col="customer_name" /></span>
                </th>
                <th onClick={() => toggleSort('service_type')} className="cursor-pointer">
                  <span className="flex items-center gap-1">Xidmət <SortIcon col="service_type" /></span>
                </th>
                <th onClick={() => toggleSort('total_price')} className="cursor-pointer">
                  <span className="flex items-center gap-1">Məbləğ <SortIcon col="total_price" /></span>
                </th>
                <th>Ödənilib</th>
                <th>Status</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="empty-state">
                      <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center mb-3">
                        <Search size={20} className="text-dark-500" />
                      </div>
                      <p className="text-dark-400 font-medium">Qeyd tapılmadı</p>
                      <p className="text-dark-600 text-xs mt-1">Axtarış şərtlərini dəyişin</p>
                    </div>
                  </td>
                </tr>
              ) : records.map(r => (
                <tr key={r.id} className={selected.has(r.id) ? 'selected' : ''}>
                  <td>
                    <button onClick={() => toggleSelect(r.id)} className="text-dark-400 hover:text-white">
                      {selected.has(r.id) ? <CheckSquare size={15} className="text-primary-400" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="text-dark-300 font-mono text-xs">{r.date}</td>
                  <td className="text-dark-500 text-xs">{r.time || '—'}</td>
                  <td className="font-medium text-white">{[r.car_brand, r.car_model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="text-dark-400 text-xs font-mono">{r.car_plate || '—'}</td>
                  <td className="text-dark-300">
                    <button
                      type="button"
                      className="text-primary-400 hover:underline"
                      onClick={() => openCustomerDetail(r)}
                    >
                      {r.customer_name || '—'}
                    </button>
                  </td>
                  <td className="text-dark-200 max-w-[180px] truncate" title={r.service_type}>{r.service_type || '—'}</td>
                  <td className="font-semibold text-emerald-400">{fmt(r.total_price)}</td>
                  <td className="text-dark-300">{fmt(r.paid_amount)}</td>
                  <td>
                    <span className={STATUS_MAP[r.payment_status]?.cls || 'status-badge bg-dark-700 text-dark-400'}>
                      {STATUS_MAP[r.payment_status]?.label || r.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="btn-icon w-7 h-7" title="Redaktə et">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(r.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400" title="Sil">
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

      <Modal open={!!editRecord} onClose={() => setEditRecord(null)} title="Qeydi Redaktə Et" size="lg"
        footer={
          <>
            <button onClick={() => setEditRecord(null)} className="btn-secondary">Ləğv et</button>
            <button onClick={handleEditSave} disabled={editSaving} className="btn-primary">
              {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Yadda saxla
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Tarix</label><input type="date" className="input-field" value={editForm.date} onChange={e => setEditField('date', e.target.value)} /></div>
          <div><label className="label">Saat</label><input type="time" className="input-field" value={editForm.time} onChange={e => setEditField('time', e.target.value)} /></div>
          <div><label className="label">Müştəri adı</label><input className="input-field" value={editForm.customer_name} onChange={e => setEditField('customer_name', e.target.value)} /></div>
          <div><label className="label">Telefon</label><input className="input-field" value={editForm.customer_phone} onChange={e => setEditField('customer_phone', e.target.value)} /></div>
          <div><label className="label">Kateqoriya</label><input className="input-field" value={editForm.car_brand} onChange={e => setEditField('car_brand', e.target.value)} /></div>
          <div><label className="label">Marka / Model</label><input className="input-field" value={editForm.car_model} onChange={e => setEditField('car_model', e.target.value)} /></div>
          <div><label className="label">Kod / Seriya</label><input className="input-field" value={editForm.car_plate} onChange={e => setEditField('car_plate', e.target.value)} /></div>
          <div><label className="label">Xidmət növü</label><input className="input-field" value={editForm.service_type} onChange={e => setEditField('service_type', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Əlavə xidmətlər</label><input className="input-field" value={editForm.extra_services} onChange={e => setEditField('extra_services', e.target.value)} /></div>
          <div><label className="label">Vahid qiymət ({csym})</label><input type="number" step="0.01" className="input-field" value={editForm.unit_price} onChange={e => setEditField('unit_price', e.target.value)} /></div>
          <div><label className="label">Yekun qiymət ({csym})</label><input type="number" step="0.01" className="input-field" value={editForm.total_price} onChange={e => setEditField('total_price', e.target.value)} /></div>
          <div>
            <label className="label">Ödəniş statusu</label>
            <select className="select-field" value={editForm.payment_status} onChange={e => setEditField('payment_status', e.target.value)}>
              {PAYMENT_STATUS_OPTIONS.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div><label className="label">Ödənilən məbləğ ({csym})</label><input type="number" step="0.01" className="input-field" value={editForm.paid_amount} onChange={e => setEditField('paid_amount', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Qeyd</label><textarea className="input-field resize-none h-16" value={editForm.notes} onChange={e => setEditField('notes', e.target.value)} /></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Qeydi Sil"
        message="Bu qeydi silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz."
        loading={deleteLoading}
      />

      {customerModal.open && (
        <Modal
          open={customerModal.open}
          onClose={() => { setCustomerModal({ open: false, loading: false, customer: null, vehicles: [] }); setSelectedRecord(null); }}
          title="Müştəri məlumatı"
          size="xl"
        >
          {customerModal.loading ? (
            <div className="flex items-center gap-2 text-dark-300">
              <Loader2 className="animate-spin" size={16} /> Yüklənir...
            </div>
          ) : (
            <div className="space-y-4">
              {selectedRecord && (
                <div className="card p-3 border border-dark-700 bg-dark-900/60">
                  <div className="text-xs text-dark-500 mb-2">Qeyd məlumatı</div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-dark-100">
                    <div>
                      <div className="text-dark-500 text-xs">Tarix</div>
                      <div>{selectedRecord.date} {selectedRecord.time || ''}</div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs">Xidmət</div>
                      <div className="text-dark-100">{selectedRecord.service_type || '—'}</div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs">Məbləğ</div>
                      <div className="text-emerald-400 font-semibold">{fmt(selectedRecord.total_price)}</div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs">Ödənilib</div>
                      <div className="text-dark-200">{fmt(selectedRecord.paid_amount)}</div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs">Status</div>
                      <div className="text-dark-100">{STATUS_MAP[selectedRecord.payment_status]?.label || selectedRecord.payment_status || '—'}</div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs">Qalıq</div>
                      <div className="text-amber-300">{fmt((selectedRecord.total_price || 0) - (selectedRecord.paid_amount || 0))}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-dark-500 text-xs">Əlavə xidmətlər</div>
                      <div className="text-dark-100">{selectedRecord.extra_services || '—'}</div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs">Aktiv</div>
                      <div className="text-white font-semibold">{[selectedRecord.car_brand, selectedRecord.car_model].filter(Boolean).join(' ') || '—'}</div>
                      <div className="text-xs text-dark-400">{selectedRecord.car_plate || '—'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-dark-500 text-xs">Qeyd</div>
                      <div className="text-dark-100 whitespace-pre-wrap">{selectedRecord.notes || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-dark-500">Ad</div>
                <div className="text-base text-white font-semibold">{customerModal.customer?.name || selectedRecord?.customer_name || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-dark-500">Telefon</div>
                  <div className="text-sm text-dark-100">{customerModal.customer?.phone || selectedRecord?.customer_phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-500">Qeyd</div>
                  <div className="text-sm text-dark-100">{customerModal.customer?.notes || '—'}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-dark-500 mb-2">Aktivlər</div>
                {customerModal.vehicles.length === 0 ? (
                  <div className="text-dark-400 text-sm">Aktiv qeyd olunmayıb</div>
                ) : (
                  <div className="space-y-2">
                    {customerModal.vehicles.map(v => (
                      <div key={v.id} className="rounded border border-dark-700 p-2 text-sm text-dark-100 flex justify-between">
                        <div>
                          <div className="font-semibold text-white">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</div>
                          <div className="text-dark-400 text-xs">{v.plate || '—'}</div>
                        </div>
                        {v.year ? <div className="text-dark-300 text-xs">{v.year}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Seçilmiş Qeydləri Sil"
        message={`${selected.size} qeydi silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.`}
        loading={deletingBulk}
      />
    </div>
  );
}
