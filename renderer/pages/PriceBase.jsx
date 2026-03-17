import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Loader2, Save, Tag, RefreshCw, FileSpreadsheet, DollarSign, Layers, TrendingUp, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrencySymbol } from '../utils/currency';

const EMPTY_FORM = { brand: '', service_type: '', price: '', notes: '' };

const COMMON_SERVICES = [
  'Ekran dəyişmə', 'Batareya dəyişmə', 'Şarj portu təmiri',
  'Proqram yüklənməsi', 'Diagnostika', 'Təmizləmə',
  'Hissə dəyişmə', 'Quraşdırma', 'Texniki baxış',
  'Kalibrasiya', 'Məlumat köçürmə', 'Aksesuarlar',
  'Garanti təmiri', 'Su zərəri təmiri', 'Kamera təmiri',
  'Mikrofon təmiri', 'Dinləyici təmiri', 'Ümumi təmir',
];

export default function PriceBase() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const userId = isAdmin ? null : currentUser?.id;
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.api.getPrices(search, userId);
      if (res.success) setPrices(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, userId]);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({ brand: p.brand || '', service_type: p.service_type || '', price: p.price || '', notes: p.notes || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.service_type) { showNotification('Xidmət növü daxil edin', 'error'); return; }
    setSaving(true);
    try {
      let result;
      if (editing) result = await window.api.updatePrice(editing.id, { ...form, price: parseFloat(form.price) || null });
      else result = await window.api.createPrice({ ...form, price: parseFloat(form.price) || null, created_by: currentUser?.id });

      if (result.success) {
        showNotification(editing ? 'Qiymət yeniləndi' : 'Qiymət əlavə edildi', 'success');
        setModalOpen(false);
        loadPrices();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const result = await window.api.deletePrice(deleteId);
      if (result.success) {
        showNotification('Qiymət silindi', 'success');
        setDeleteId(null);
        loadPrices();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  const [activeBrand, setActiveBrand] = useState('');

  const brands = ['', ...Array.from(new Set(prices.map(p => p.brand || 'Ümumi'))).sort((a, b) => a === 'Ümumi' ? 1 : b === 'Ümumi' ? -1 : a.localeCompare(b))];
  const pricesWithBrand = prices.map(p => ({ ...p, _brand: p.brand || 'Ümumi' }));
  const filteredPrices = activeBrand ? pricesWithBrand.filter(p => p._brand === activeBrand) : pricesWithBrand;

  const grouped = filteredPrices.reduce((acc, p) => {
    const key = p._brand;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const avgPrice = prices.filter(p => p.price > 0).reduce((s, p) => s + p.price, 0) / (prices.filter(p => p.price > 0).length || 1);
  const maxPrice = prices.reduce((m, p) => Math.max(m, p.price || 0), 0);
  const brandsCount = new Set(prices.map(p => p.brand).filter(Boolean)).size;

  async function handleExportExcel() {
    try {
      const exportData = prices.map(p => ({
        Marka: p.brand || 'Ümumi',
        'Xidmət növü': p.service_type,
        [`Qiymət (${csym})`]: p.price || '-',
        Qeyd: p.notes || '-',
      }));
      const result = await window.api.exportExcel(exportData, `qiymet-bazasi-${new Date().toISOString().split('T')[0]}.xlsx`);
      if (result.success) { showNotification('Excel hazır oldu', 'success'); window.api.showItemInFolder(result.path); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Qiymət Bazası</h1>
          <p className="text-sm text-dark-400 mt-0.5">{prices.length} qiymət qeydi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPrices} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni Qiymət
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Cəmi Qiymət</p>
            <Tag size={14} className="text-primary-400" />
          </div>
          <p className="text-2xl font-black text-white">{prices.length}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">xidmət qeydi</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Markalar</p>
            <Layers size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{brandsCount}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">ümumi kateqoriya</p>
        </div>
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ort. Qiymət</p>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{avgPrice.toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{csym} orta</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Maks. Qiymət</p>
            <DollarSign size={14} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{maxPrice.toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{csym} maksimum</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Xidmət, marka ilə axtar..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={handleExportExcel} className="btn-secondary text-xs py-2">
          <FileSpreadsheet size={13} /> Excel
        </button>
      </div>

      {/* Brand Filter Tabs */}
      {brands.length > 2 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {brands.map(b => (
            <button key={b} onClick={() => setActiveBrand(b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                activeBrand === b
                  ? 'bg-primary-600 text-white border-primary-500'
                  : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white'
              }`}>
              {b || 'Hamısı'} {b ? `(${pricesWithBrand.filter(p => p._brand === b).length})` : `(${prices.length})`}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : prices.length === 0 ? (
          <div className="empty-state pt-20">
            <Tag size={36} className="text-dark-600 mb-3" />
            <p className="text-dark-400 font-medium">Qiymət bazası boşdur</p>
            <p className="text-dark-600 text-xs mt-1">Yeni qiymət əlavə edin</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).sort(([a], [b]) => a === 'Ümumi' ? 1 : b === 'Ümumi' ? -1 : a.localeCompare(b)).map(([brand, items]) => (
              <div key={brand} className="card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-dark-800/50 border-b border-dark-700">
                  <Tag size={13} className="text-primary-400" />
                  <span className="text-sm font-semibold text-white">{brand}</span>
                  <span className="text-xs text-dark-500 ml-1">({items.length})</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Xidmət növü</th>
                      <th>Qiymət ({csym})</th>
                      <th>Qeyd</th>
                      <th className="w-20">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(p => (
                      <tr key={p.id}>
                        <td className="font-medium text-white">{p.service_type}</td>
                        <td className="font-semibold text-emerald-400 text-base">
                          {p.price ? `${Number(p.price).toFixed(2)} ${csym}` : <span className="text-dark-500 text-xs">Qiymət yoxdur</span>}
                        </td>
                        <td className="text-dark-400 text-xs">{p.notes || '—'}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(p)} className="btn-icon w-7 h-7"><Edit3 size={13} /></button>
                            <button onClick={() => setDeleteId(p.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Qiyməti Redaktə Et' : 'Yeni Qiymət'} size="sm"
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
            <label className="label">Marka (boş = ümumi)</label>
            <input className="input-field" placeholder="Telefon, Elektronika... (boş buraxılsa hamısına aid olur)" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
          </div>
          <div>
            <label className="label">Xidmət növü *</label>
            <input className="input-field" list="service-list" placeholder="Ekran dəyişmə, Təmir..." value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} />
            <datalist id="service-list">
              {COMMON_SERVICES.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Qiymət ({csym})</label>
            <input type="number" min="0" step="0.01" className="input-field" placeholder="45.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div>
            <label className="label">Qeyd</label>
            <input className="input-field" placeholder="Əlavə məlumat..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Qiyməti Sil" message="Bu qiymət qeydini silmək istədiyinizə əminsiniz?" loading={deleteLoading} />
    </div>
  );
}
