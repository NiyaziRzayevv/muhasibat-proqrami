import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Loader2, Save, Truck, RefreshCw, Package } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiRequest } from '../api/http';

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Suppliers() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [detailProducts, setDetailProducts] = useState([]);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = window.api?.getSuppliers
        ? await window.api.getSuppliers(search, userId)
        : await apiRequest(`/suppliers?${new URLSearchParams({
          ...(search ? { search } : {}),
          ...(userId ? { userId } : {}),
        }).toString()}`, { token: getToken() });
      if (res.success) setSuppliers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM }); setModalOpen(true); }

  function openEdit(s) {
    setEditing(s);
    setForm({ name: s.name || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' });
    setModalOpen(true);
  }

  async function openDetail(s) {
    setDetailSupplier(s);
    const res = window.api?.getSupplierProducts
      ? await window.api.getSupplierProducts(s.id)
      : await apiRequest(`/suppliers/${s.id}/products`, { token: getToken() });
    if (res.success) setDetailProducts(res.data);
  }

  async function handleSave() {
    if (!form.name) { showNotification('Təchizatçı adı daxil edin', 'error'); return; }
    setSaving(true);
    try {
      let result;
      if (editing) {
        result = window.api?.updateSupplier
          ? await window.api.updateSupplier(editing.id, form)
          : await apiRequest(`/suppliers/${editing.id}`, { method: 'PUT', token: getToken(), body: form });
      } else {
        result = window.api?.createSupplier
          ? await window.api.createSupplier({ ...form, created_by: currentUser?.id })
          : await apiRequest('/suppliers', { method: 'POST', token: getToken(), body: form });
      }

      if (result.success) {
        showNotification(editing ? 'Təchizatçı yeniləndi' : 'Təchizatçı əlavə edildi', 'success');
        setModalOpen(false);
        loadData();
      } else { showNotification(result.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = window.api?.deleteSupplier
        ? await window.api.deleteSupplier(deleteId)
        : await apiRequest(`/suppliers/${deleteId}`, { method: 'DELETE', token: getToken() });
      if (result.success) {
        showNotification('Təchizatçı silindi', 'success');
        setDeleteId(null);
        loadData();
      } else { showNotification(result.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Təchizatçılar</h1>
          <p className="text-sm text-dark-400 mt-0.5">{suppliers.length} təchizatçı</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni Təchizatçı
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input className="input-field pl-9 h-9 text-xs max-w-sm" placeholder="Ad, telefon, email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Ad</th><th>Telefon</th><th>Email</th><th>Ünvan</th><th>Məhsul sayı</th><th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <div className="empty-state">
                    <Truck size={36} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Təchizatçı tapılmadı</p>
                  </div>
                </td></tr>
              ) : suppliers.map((s, i) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => openDetail(s)}>
                  <td className="text-dark-500">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-xs text-dark-400 font-bold shrink-0">
                        {(s.name || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-dark-300">{s.phone || '—'}</td>
                  <td className="text-dark-300 text-xs">{s.email || '—'}</td>
                  <td className="text-dark-400 text-xs max-w-[140px] truncate">{s.address || '—'}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 text-xs text-dark-300">
                      <Package size={11} /> {s.product_count || 0}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="btn-icon w-7 h-7"><Edit3 size={13} /></button>
                      <button onClick={() => setDeleteId(s.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Təchizatçını Redaktə Et' : 'Yeni Təchizatçı'} size="sm"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Ləğv et</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Yadda saxla
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div><label className="label">Ad *</label><input className="input-field" placeholder="Şirkət adı" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Telefon</label><input className="input-field" placeholder="050-000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><label className="label">Email</label><input className="input-field" placeholder="info@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">Ünvan</label><input className="input-field" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><label className="label">Qeyd</label><textarea className="input-field resize-none h-16" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      <Modal open={!!detailSupplier} onClose={() => setDetailSupplier(null)}
        title={detailSupplier?.name || 'Təchizatçı Detayı'} size="md">
        {detailSupplier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {detailSupplier.phone && <div className="flex gap-2"><span className="text-dark-400">Telefon:</span><span className="text-white">{detailSupplier.phone}</span></div>}
              {detailSupplier.email && <div className="flex gap-2"><span className="text-dark-400">Email:</span><span className="text-white">{detailSupplier.email}</span></div>}
              {detailSupplier.address && <div className="flex gap-2 col-span-2"><span className="text-dark-400">Ünvan:</span><span className="text-white">{detailSupplier.address}</span></div>}
            </div>
            <div className="border-t border-dark-700 pt-3">
              <p className="text-xs font-semibold text-dark-400 uppercase mb-2">Məhsullar ({detailProducts.length})</p>
              {detailProducts.length === 0 ? (
                <p className="text-dark-500 text-sm">Bu təchizatçıya aid məhsul yoxdur</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detailProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                      <span className="text-sm text-white">{p.name}</span>
                      <span className="text-xs text-dark-400">{p.stock_qty} {p.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Təchizatçını Sil" message="Bu təchizatçını silmək istədiyinizə əminsiniz?" loading={deleteLoading} />
    </div>
  );
}
