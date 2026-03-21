import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Loader2, Save, RefreshCw, FileSpreadsheet, Package, Filter, X, Building2, Wrench, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrencySymbol } from '../utils/currency';
import * as XLSX from 'xlsx';

const ASSET_STATUSES = [
  { value: 'active', label: 'Aktiv', cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' },
  { value: 'repair', label: 'Təmirdə', cls: 'bg-amber-900/30 text-amber-400 border-amber-700/40' },
  { value: 'inactive', label: 'Aktiv deyil', cls: 'bg-red-900/30 text-red-400 border-red-700/40' },
];

const ASSET_CATEGORIES = ['Avadanlıq', 'Cihaz', 'Mebel', 'Nəqliyyat', 'Alət', 'Kompüter', 'Digər'];

const EMPTY_FORM = { name: '', category: 'Avadanlıq', serial_number: '', purchase_date: '', purchase_price: '', current_value: '', location: '', status: 'active', condition: 'yaxşı', notes: '' };

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)}`;
}

export default function Assets() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const userId = isAdmin ? null : currentUser?.id;

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (userId) filters.userId = userId;
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (search) filters.search = search;

      const res = await apiBridge.getAssets(filters);
      if (res?.success) setAssets(res.data || []);
    } catch (e) {
      showNotification('Aktivlər yüklənmədi: ' + e.message, 'error');
    }
    setLoading(false);
  }, [userId, statusFilter, categoryFilter, search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({
      name: a.name || '',
      category: a.category || 'Avadanlıq',
      serial_number: a.serial_number || a.serialNumber || '',
      purchase_date: a.purchase_date || a.purchaseDate || '',
      purchase_price: a.purchase_price ?? a.purchasePrice ?? '',
      current_value: a.current_value ?? a.currentValue ?? '',
      location: a.location || '',
      status: a.status || 'active',
      condition: a.condition || 'yaxşı',
      notes: a.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { showNotification('Ad tələb olunur', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : null,
        current_value: form.current_value !== '' ? Number(form.current_value) : null,
      };

      const res = editing
        ? await apiBridge.updateAsset(editing.id, payload)
        : await apiBridge.createAsset(payload);

      if (res?.success) {
        showNotification(editing ? 'Aktiv yeniləndi' : 'Aktiv əlavə edildi', 'success');
        setModalOpen(false);
        load();
      } else {
        showNotification(res?.error || 'Xəta baş verdi', 'error');
      }
    } catch (e) {
      showNotification(e.message, 'error');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await apiBridge.deleteAsset(deleteId);

      if (res?.success) {
        showNotification('Aktiv silindi', 'success');
        load();
      } else {
        showNotification(res?.error || 'Xəta baş verdi', 'error');
      }
    } catch (e) {
      showNotification(e.message, 'error');
    }
    setDeleteId(null);
  }

  function exportExcel() {
    if (!assets.length) { showNotification('Export üçün məlumat yoxdur', 'error'); return; }
    const rows = assets.map(a => ({
      'Ad': a.name,
      'Kateqoriya': a.category,
      'Seriya №': a.serial_number || a.serialNumber || '',
      'Alış tarixi': a.purchase_date || a.purchaseDate || '',
      [`Alış qiyməti (${csym})`]: a.purchase_price ?? a.purchasePrice ?? '',
      [`Cari dəyər (${csym})`]: a.current_value ?? a.currentValue ?? '',
      'Yer': a.location || '',
      'Status': ASSET_STATUSES.find(s => s.value === a.status)?.label || a.status,
      'Vəziyyət': a.condition || '',
      'Qeyd': a.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-fit columns
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 2, ...rows.map(r => String(r[k] || '').length + 2)) }));
    ws['!cols'] = colWidths;

    // Bold header
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[addr]) ws[addr].s = { font: { bold: true } };
    }

    // Total row
    const totalPurchase = assets.reduce((s, a) => s + Number(a.purchase_price ?? a.purchasePrice ?? 0), 0);
    const totalCurrent = assets.reduce((s, a) => s + Number(a.current_value ?? a.currentValue ?? 0), 0);
    XLSX.utils.sheet_add_aoa(ws, [['YEKUN', '', '', '', totalPurchase, totalCurrent, '', '', '', '']], { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aktivlər');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `aktivler_${today}.xlsx`);
    showNotification('Excel export edildi', 'success');
  }

  const statusObj = (val) => ASSET_STATUSES.find(s => s.value === val) || ASSET_STATUSES[0];
  const totalValue = assets.reduce((s, a) => s + Number(a.current_value ?? a.currentValue ?? a.purchase_price ?? a.purchasePrice ?? 0), 0);

  return (
    <div className="min-h-full p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Building2 size={20} className="text-purple-400" />
            </div>
            Aktivlər / İnventar
          </h1>
          <p className="text-dark-400 text-sm mt-1">{assets.length} aktiv · Ümumi dəyər: {fmt(totalValue)} {csym}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="btn-secondary text-xs flex items-center gap-1.5">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={load} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={13} /> Yenilə
          </button>
          <button onClick={openCreate} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus size={13} /> Yeni Aktiv
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="card p-4 border border-purple-800/30 bg-purple-900/10">
          <p className="text-xs text-dark-400">Ümumi Aktiv</p>
          <p className="text-2xl font-black text-purple-400">{assets.length}</p>
        </div>
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <p className="text-xs text-dark-400">Aktiv</p>
          <p className="text-2xl font-black text-emerald-400">{assets.filter(a => a.status === 'active').length}</p>
        </div>
        <div className="card p-4 border border-amber-800/30 bg-amber-900/10">
          <p className="text-xs text-dark-400">Təmirdə</p>
          <p className="text-2xl font-black text-amber-400">{assets.filter(a => a.status === 'repair').length}</p>
        </div>
        <div className="card p-4 border border-blue-800/30 bg-blue-900/10">
          <p className="text-xs text-dark-400">Ümumi Dəyər</p>
          <p className="text-xl font-black text-blue-400">{fmt(totalValue)} {csym}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Ad, seriya nömrəsi, yer..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-field h-9 text-xs w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Bütün statuslar</option>
          {ASSET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="select-field h-9 text-xs w-36" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">Bütün kateqoriyalar</option>
          {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(statusFilter || categoryFilter) && (
          <button onClick={() => { setStatusFilter(''); setCategoryFilter(''); }} className="text-xs text-dark-400 hover:text-white flex items-center gap-1">
            <X size={12} /> Təmizlə
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-primary-400" />
        </div>
      ) : assets.length === 0 ? (
        <div className="empty-state h-40 flex flex-col items-center justify-center">
          <Building2 size={32} className="text-dark-600 mb-2" />
          <p className="text-dark-500 text-sm">Aktiv tapılmadı</p>
          <button onClick={openCreate} className="btn-primary text-xs mt-3">
            <Plus size={12} /> Yeni Aktiv Əlavə Et
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-700 text-dark-400">
                  <th className="text-left px-3 py-2.5 font-semibold">Ad</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Kateqoriya</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Seriya №</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Yer</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Alış ({csym})</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Cari ({csym})</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Vəziyyət</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => {
                  const st = statusObj(a.status);
                  return (
                    <tr key={a.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-white">{a.name}</td>
                      <td className="px-3 py-2.5 text-dark-300">{a.category}</td>
                      <td className="px-3 py-2.5 text-dark-400 font-mono">{a.serial_number || a.serialNumber || '—'}</td>
                      <td className="px-3 py-2.5 text-dark-300">{a.location || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-dark-300">{a.purchase_price ?? a.purchasePrice ? fmt(a.purchase_price ?? a.purchasePrice) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-400 font-semibold">{a.current_value ?? a.currentValue ? fmt(a.current_value ?? a.currentValue) : '—'}</td>
                      <td className="px-3 py-2.5 text-center text-dark-300">{a.condition || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>
                          {st.value === 'active' ? <CheckCircle size={10} /> : st.value === 'repair' ? <Wrench size={10} /> : <XCircle size={10} />}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(a)} className="w-6 h-6 rounded hover:bg-dark-700 flex items-center justify-center text-dark-400 hover:text-blue-400">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => setDeleteId(a.id)} className="w-6 h-6 rounded hover:bg-dark-700 flex items-center justify-center text-dark-400 hover:text-red-400">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Aktiv Redaktə' : 'Yeni Aktiv'}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Ad *</label>
              <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aktiv adı" />
            </div>
            <div>
              <label className="label">Kateqoriya</label>
              <select className="select-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Seriya №</label>
              <input className="input-field" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Alış tarixi</label>
              <input type="date" className="input-field" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Alış qiyməti ({csym})</label>
              <input type="number" step="0.01" className="input-field" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cari dəyər ({csym})</label>
              <input type="number" step="0.01" className="input-field" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} />
            </div>
            <div>
              <label className="label">Yer/Lokasiya</label>
              <input className="input-field" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {ASSET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vəziyyət</label>
              <select className="select-field" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                <option value="yaxşı">Yaxşı</option>
                <option value="orta">Orta</option>
                <option value="köhnə">Köhnə</option>
                <option value="xarab">Xarab</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Qeyd</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModalOpen(false)} className="btn-secondary text-xs">Ləğv et</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {editing ? 'Yenilə' : 'Əlavə et'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Aktiv silinsin?"
          message="Bu aktiv arxivlənəcək. Davam etmək istəyirsiniz?"
        />
      )}
    </div>
  );
}
