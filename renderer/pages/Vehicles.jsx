import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Loader2, Save, Boxes, RefreshCw, FileSpreadsheet, Users, TrendingUp, ClipboardList, Calendar, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import * as XLSX from 'xlsx';

const EMPTY_FORM = { customer_id: '', brand: '', model: '', plate: '', year: '', notes: '' };
// brand = kateqoriya/növ, model = marka/model, plate = kod/seriya, year = il

function fmt(n) {
  if (!n) return '—';
  return `${Number(n).toFixed(2)} ₼`;
}

export default function Vehicles() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, cRes] = await Promise.all([
        window.api?.getVehicles
          ? window.api.getVehicles(search, userId)
          : apiRequest(`/vehicles?${new URLSearchParams({
            ...(search ? { search } : {}),
            ...(userId ? { userId } : {}),
          }).toString()}`, { token: getToken() }),
        window.api?.getCustomers
          ? window.api.getCustomers('', userId)
          : apiRequest(`/customers?${new URLSearchParams({
            ...(userId ? { userId } : {}),
          }).toString()}`, { token: getToken() }),
      ]);
      if (vRes.success) setVehicles(vRes.data);
      if (cRes.success) setCustomers(cRes.data);
    } catch (e) { console.error(e); }  
    finally { setLoading(false); }
  }, [search, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(v) {
    setEditing(v);
    setForm({
      customer_id: v.customer_id || '',
      brand: v.brand || '',
      model: v.model || '',
      plate: v.plate || '',
      year: v.year || '',
      notes: v.notes || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.brand) { showNotification('Kateqoriya / Növ daxil edin', 'error'); return; }
    setSaving(true);
    try {
      let res;
      if (editing) {
        res = window.api?.updateVehicle
          ? await window.api.updateVehicle(editing.id, form)
          : await apiRequest(`/vehicles/${editing.id}`, { method: 'PUT', token: getToken(), body: form });
      } else {
        res = window.api?.createVehicle
          ? await window.api.createVehicle({ ...form, created_by: currentUser?.id })
          : await apiRequest('/vehicles', { method: 'POST', token: getToken(), body: form });
      }

      if (res.success) {
        showNotification(editing ? 'Aktiv yeniləndi' : 'Aktiv əlavə edildi', 'success');
        setModalOpen(false);
        loadData();
      } else {
        showNotification(res.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = window.api?.deleteVehicle
        ? await window.api.deleteVehicle(deleteId)
        : await apiRequest(`/vehicles/${deleteId}`, { method: 'DELETE', token: getToken() });
      if (result.success) {
        showNotification('Aktiv silindi', 'success');
        setDeleteId(null);
        loadData();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  const [filterBrand, setFilterBrand] = useState('');

  // Stats
  const brands = Array.from(new Set(vehicles.map(v => v.brand).filter(Boolean))).sort();
  const totalSpent = vehicles.reduce((s, v) => s + (v.total_spent || 0), 0);
  const totalServices = vehicles.reduce((s, v) => s + (v.service_count || 0), 0);
  const withCustomer = vehicles.filter(v => v.customer_id).length;

  const filteredVehicles = filterBrand ? vehicles.filter(v => v.brand === filterBrand) : vehicles;

  async function handleExportExcel() {
    try {
      const exportData = vehicles.map(v => ({
        Marka: v.brand || '-', Model: v.model || '-',
        'Nömrə': v.plate || '-', İl: v.year || '-',
        Müştəri: v.customer_name || '-',
        'Qeyd Sayı': v.service_count || 0,
        'Ümumi Xərc': v.total_spent || 0,
        'Son Qeyd': v.last_service || '-',
      }));
      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(exportData, `aktivler-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) { showNotification('Excel hazır oldu', 'success'); window.api.showItemInFolder(result.path); }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aktivlər');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aktivler-${new Date().toISOString().split('T')[0]}.xlsx`;
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
          <h1 className="page-title flex items-center gap-2"><Boxes size={20} className="text-primary-400" /> Aktivlər</h1>
          <p className="text-sm text-dark-400 mt-0.5">{vehicles.length} aktiv · {brands.length} kateqoriya</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-xs py-1.5">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni Aktiv
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Cəmi Aktiv</p>
            <Boxes size={14} className="text-primary-400" />
          </div>
          <p className="text-2xl font-black text-white">{vehicles.length}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{brands.length} fərqli kateqoriya</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Müştərili</p>
            <Users size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{withCustomer}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{vehicles.length - withCustomer} sərbəst</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Qeyd Sayı</p>
            <ClipboardList size={14} className="text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">{totalServices}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">ümumi qeyd</p>
        </div>
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ümumi Xərc</p>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{Number(totalSpent).toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">₼ məcmu</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Kateqoriya, marka, kod..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 h-9 text-xs text-white focus:outline-none">
          <option value="">Bütün kateqoriyalar</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {(filterBrand || search) && (
          <button onClick={() => { setFilterBrand(''); setSearch(''); }}
            className="flex items-center gap-1 px-2 h-9 rounded-xl bg-red-900/20 text-red-400 text-xs hover:bg-red-900/40 transition-colors">
            Sıfırla
          </button>
        )}
        <span className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-dark-800 text-dark-300">{filteredVehicles.length} nəticə</span>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Kateqoriya / Model</th>
                <th>Kod / Seriya</th>
                <th>İl</th>
                <th>Müştəri</th>
                <th>Qeyd sayı</th>
                <th>Ümumi xərc</th>
                <th>Son qeyd</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <div className="empty-state">
                    <Boxes size={32} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Aktiv tapılmadı</p>
                  </div>
                </td></tr>
              ) : filteredVehicles.map((v, i) => (
                <tr key={v.id} className={v.service_count > 0 ? '' : 'opacity-60'}>
                  <td className="text-dark-500 font-mono text-xs">#{v.id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-900/40 to-primary-800/20 border border-primary-700/30 flex items-center justify-center shrink-0">
                        <Boxes size={14} className="text-primary-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{v.brand} <span className="text-dark-400 font-normal">{v.model || ''}</span></p>
                        {v.plate && <p className="text-[10px] text-dark-500 font-mono">{v.plate}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-dark-300">{v.plate || '—'}</td>
                  <td className="text-dark-400">{v.year || '—'}</td>
                  <td>
                    {v.customer_name ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400">
                        <Users size={9} /> {v.customer_name}
                      </span>
                    ) : <span className="text-dark-600">—</span>}
                  </td>
                  <td>
                    <span className={`font-semibold ${v.service_count > 0 ? 'text-purple-400' : 'text-dark-600'}`}>
                      {v.service_count || 0}
                    </span>
                  </td>
                  <td className="font-bold text-emerald-400">{fmt(v.total_spent)}</td>
                  <td className="text-dark-400 text-xs">
                    {v.last_service ? (
                      <span className="flex items-center gap-1"><Calendar size={10} /> {v.last_service}</span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(v)} className="btn-icon w-7 h-7"><Edit3 size={13} /></button>
                      <button onClick={() => setDeleteId(v.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Aktivi Redaktə Et' : 'Yeni Aktiv'} size="sm"
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
          <div>
            <label className="label">Müştəri</label>
            <select className="select-field" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">— Seçin —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kateqoriya / Növ *</label>
              <input className="input-field" placeholder="Telefon, Masin, Paltar..." value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <label className="label">Marka / Model</label>
              <input className="input-field" placeholder="Samsung Galaxy, Toyota..." value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kod / Seriya</label>
              <input className="input-field" placeholder="SN-12345" value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} />
            </div>
            <div>
              <label className="label">İl</label>
              <input type="number" className="input-field" placeholder="2018" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Qeyd</label>
            <textarea className="input-field resize-none h-16" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Aktivi Sil" message="Bu aktivi silmək istədiyinizə əminsiniz?" loading={deleteLoading} />
    </div>
  );
}
