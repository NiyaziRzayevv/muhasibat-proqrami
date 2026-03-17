import React, { useState, useEffect, useCallback } from 'react';
import useDebounce from '../hooks/useDebounce';
import {
  Search, Plus, Edit3, Trash2, Loader2, Save, Package,
  RefreshCw, Filter, AlertTriangle, ArrowDown, ArrowUp, X, FileUp,
  FileSpreadsheet, TrendingUp, DollarSign, BarChart2, Layers
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { getCurrencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

const UNITS = ['ədəd', 'litr', 'kg', 'metr', 'qutu', 'dəst', 'cüt', 'banka'];
const EMPTY_FORM = {
  name: '', category_id: '', sku: '', barcode: '',
  buy_price: '', sell_price: '', stock_qty: '0', min_stock: '5',
  unit: 'ədəd', supplier_id: '', notes: ''
};

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)}`;
}

export default function Products() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const userId = isAdmin ? null : currentUser?.id;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 280);
  const [filterCat, setFilterCat] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [stockModal, setStockModal] = useState(null);
  const [stockType, setStockType] = useState('in');
  const [stockQty, setStockQty] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  const [importModal, setImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Products: remote mode supported via HTTP, categories/suppliers require Electron for now
      let pRes;
      if (window.api?.getProducts) {
        pRes = await window.api.getProducts({ search: debouncedSearch || undefined, category_id: filterCat || undefined, low_stock: filterLow || undefined, userId });
      } else {
        const token = localStorage.getItem('auth_token') || '';
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (filterCat) params.append('category_id', filterCat);
        if (filterLow) params.append('low_stock', 'true');
        const q = params.toString() ? `?${params.toString()}` : '';
        pRes = await apiRequest(`/products${q}`, { token });
      }
      if (pRes?.success) setProducts(pRes.data);

      if (window.api?.getCategories) {
        const cRes = await window.api.getCategories(userId);
        if (cRes.success) setCategories(cRes.data);
      } else {
        const token = localStorage.getItem('auth_token') || '';
        const q = userId ? `?userId=${userId}` : '';
        const cRes = await apiRequest(`/categories${q}`, { token });
        if (cRes.success) setCategories(cRes.data);
      }
      if (window.api?.getSuppliers) {
        const sRes = await window.api.getSuppliers('', userId);
        if (sRes.success) setSuppliers(sRes.data);
      } else {
        const token = localStorage.getItem('auth_token') || '';
        let q = '';
        if (userId) q = `?userId=${userId}`;
        const sRes = await apiRequest(`/suppliers${q}`, { token });
        if (sRes.success) setSuppliers(sRes.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [debouncedSearch, filterCat, filterLow, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name || '', category_id: p.category_id || '',
      sku: p.sku || '', barcode: p.barcode || '',
      buy_price: p.buy_price ?? '', sell_price: p.sell_price ?? '',
      stock_qty: p.stock_qty ?? 0, min_stock: p.min_stock ?? 5,
      unit: p.unit || 'ədəd', supplier_id: p.supplier_id || '', notes: p.notes || ''
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name) { showNotification('Məhsul adı daxil edin', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        buy_price: parseFloat(form.buy_price) || 0,
        sell_price: parseFloat(form.sell_price) || 0,
        stock_qty: parseFloat(form.stock_qty) || 0,
        min_stock: parseFloat(form.min_stock) || 5,
        sku: form.sku || null,
        barcode: form.barcode || null,
      };
      let result;
      if (window.api?.createProduct) {
        if (editing) result = await window.api.updateProduct(editing.id, { ...payload, updated_by: currentUser?.id });
        else result = await window.api.createProduct({ ...payload, created_by: currentUser?.id });
      } else {
        const token = localStorage.getItem('auth_token') || '';
        if (editing) result = await apiRequest(`/products/${editing.id}`, { method: 'PUT', token, body: payload });
        else result = await apiRequest('/products', { method: 'POST', token, body: payload });
      }

      if (result.success) {
        showNotification(editing ? 'Məhsul yeniləndi' : 'Məhsul əlavə edildi', 'success');
        setModalOpen(false);
        loadData();
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      let result;
      if (window.api?.deleteProduct) {
        result = await window.api.deleteProduct(deleteId);
      } else {
        const token = localStorage.getItem('auth_token') || '';
        result = await apiRequest(`/products/${deleteId}`, { method: 'DELETE', token });
      }
      if (result.success) {
        showNotification('Məhsul silindi', 'success');
        setDeleteId(null);
        loadData();
      } else { showNotification(result.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  async function handleStockAction() {
    if (!stockQty || parseFloat(stockQty) <= 0) { showNotification('Miqdar daxil edin', 'error'); return; }
    setStockSaving(true);
    try {
      let result;
      if (window.api?.stockIn) {
        if (stockType === 'in') result = await window.api.stockIn(stockModal.id, parseFloat(stockQty), stockNote, currentUser?.id);
        else result = await window.api.stockOut(stockModal.id, parseFloat(stockQty), stockNote, currentUser?.id);
      } else {
        const token = localStorage.getItem('auth_token') || '';
        const body = { product_id: stockModal.id, qty: parseFloat(stockQty), note: stockNote || null };
        if (stockType === 'in') result = await apiRequest('/stock/in', { method: 'POST', token, body });
        else result = await apiRequest('/stock/out', { method: 'POST', token, body });
      }

      if (result.success !== false) {
        showNotification(stockType === 'in' ? 'Stok artırıldı' : 'Stok azaldıldı', 'success');
        setStockModal(null);
        setStockQty('');
        setStockNote('');
        loadData();
      } else { showNotification(result.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setStockSaving(false); }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const XLSX = window.require ? null : null;
        const text = ev.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { showNotification('Fayl boşdur', 'error'); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return obj;
        }).filter(r => r.name || r.Ad);
        setImportRows(rows);
        if (rows.length === 0) showNotification('Uyğun məhsul tapılmadı. Sütun: name (və ya Ad)', 'error');
      } catch (err) { showNotification('Fayl oxuma xətası', 'error'); }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    if (!importRows.length) return;
    setImportLoading(true);
    try {
      if (!window.api?.importProductsFromExcel) {
        const token = localStorage.getItem('auth_token') || '';
        const res = await apiRequest('/products/import', { method: 'POST', token, body: { rows: importRows } });
        if (res.success) {
          showNotification(`${res.data.created} məhsul import edildi ✓`, 'success');
          setImportModal(false);
          setImportRows([]);
          loadData();
        } else showNotification(res.error || 'Xəta', 'error');
        return;
      }
      const res = await window.api.importProductsFromExcel(importRows, currentUser?.id);
      if (res.success) {
        showNotification(`${res.data.created} məhsul import edildi ✓`, 'success');
        setImportModal(false);
        setImportRows([]);
        loadData();
      } else showNotification(res.error || 'Xəta', 'error');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setImportLoading(false); }
  }

  async function handleAddCategory() {
    if (!newCatName) return;
    if (!window.api?.createCategory) {
      const token = localStorage.getItem('auth_token') || '';
      const res = await apiRequest('/categories', { method: 'POST', token, body: { name: newCatName, color: newCatColor } });
      if (res.success) {
        showNotification('Kateqoriya əlavə edildi', 'success');
        setCatModalOpen(false);
        setNewCatName('');
        await loadData();
      } else {
        showNotification(res.error || 'Xəta', 'error');
      }
      return;
    }
    const res = await window.api.createCategory({ name: newCatName, color: newCatColor, created_by: currentUser?.id });
    if (res.success) {
      showNotification('Kateqoriya əlavə edildi', 'success');
      setCatModalOpen(false);
      setNewCatName('');
      const cRes = await window.api.getCategories(userId);
      if (cRes.success) setCategories(cRes.data);
    }
  }

  const lowCount = products.filter(p => p.stock_qty <= p.min_stock).length;
  const zeroCount = products.filter(p => p.stock_qty <= 0).length;
  const totalSellValue = products.reduce((s, p) => s + (p.stock_qty * p.sell_price), 0);
  const totalBuyValue = products.reduce((s, p) => s + (p.stock_qty * p.buy_price), 0);
  const totalValue = totalSellValue;
  const avgMargin = (() => {
    const withMargin = products.filter(p => p.buy_price > 0);
    if (!withMargin.length) return 0;
    return withMargin.reduce((s, p) => s + ((p.sell_price - p.buy_price) / p.buy_price) * 100, 0) / withMargin.length;
  })();

  async function handleExportExcel() {
    try {
      const exportData = products.map(p => ({
        Ad: p.name, Kateqoriya: p.category_name || '-', SKU: p.sku || '-',
        Barkod: p.barcode || '-', Stok: p.stock_qty, Vahid: p.unit,
        'Min Stok': p.min_stock, 'Alig Qiymeti': p.buy_price, 'Satis Qiymeti': p.sell_price,
        'Stok Deyeri': (p.stock_qty * p.sell_price).toFixed(2),
        Techizcati: p.supplier_name || '-',
      }));
      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(exportData, `mehsullar-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) { showNotification('Excel hazır oldu', 'success'); window.api.showItemInFolder(result.path); }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Məhsullar');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mehsullar-${new Date().toISOString().split('T')[0]}.xlsx`;
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
          <h1 className="page-title flex items-center gap-2"><Package size={20} className="text-primary-400" /> Məhsullar (Anbar)</h1>
          <p className="text-sm text-dark-400 mt-0.5">{products.length} məhsul · {categories.length} kateqoriya</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="btn-secondary text-xs py-1.5">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setImportModal(true)} className="btn-secondary text-xs py-1.5">
            <FileUp size={13} /> CSV Import
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5">
            <Plus size={13} /> Yeni Məhsul
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Cəmi Məhsul</p>
            <Package size={14} className="text-primary-400" />
          </div>
          <p className="text-2xl font-black text-white">{products.length}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{categories.length} kateqoriya</p>
        </div>
        <div className={`card p-4 ${lowCount > 0 ? 'border border-amber-800/40 bg-amber-900/10' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Azən Stok</p>
            <AlertTriangle size={14} className={lowCount > 0 ? 'text-amber-400' : 'text-dark-600'} />
          </div>
          <p className={`text-2xl font-black ${lowCount > 0 ? 'text-amber-400' : 'text-dark-600'}`}>{lowCount}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{zeroCount} tükənib</p>
        </div>
        <div className="card p-4 border border-emerald-800/30 bg-emerald-900/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Satış Dəyəri</p>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{Number(totalSellValue).toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{csym} anbar</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Alış Dəyəri</p>
            <DollarSign size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{Number(totalBuyValue).toFixed(0)}</p>
          <p className="text-[10px] text-dark-500 mt-0.5">{csym} məcmu</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark-400">Ort. Marg</p>
            <BarChart2 size={14} className="text-purple-400" />
          </div>
          <p className={`text-2xl font-black ${avgMargin >= 20 ? 'text-emerald-400' : avgMargin >= 10 ? 'text-amber-400' : 'text-red-400'}`}>{avgMargin.toFixed(1)}%</p>
          <p className="text-[10px] text-dark-500 mt-0.5">orta qazanc</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-9 h-9 text-xs" placeholder="Ad, SKU, barkod..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-xs py-2 ${showFilters ? 'border-primary-500 text-primary-400' : ''}`}>
          <Filter size={13} /> Filter {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 flex items-end gap-4 flex-wrap animate-fade-in">
          <div>
            <label className="label text-xs">Kateqoriya</label>
            <select className="select-field text-xs h-8 w-40" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Hamısı</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-1">
            <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={filterLow} onChange={e => setFilterLow(e.target.checked)} />
            <span className="text-xs text-amber-400">Yalnız azalan stok</span>
          </label>
          <button onClick={() => { setFilterCat(''); setFilterLow(false); setSearch(''); }} className="btn-secondary text-xs h-8">
            <X size={12} /> Sıfırla
          </button>
          <button onClick={() => setCatModalOpen(true)} className="btn-secondary text-xs h-8 ml-auto">
            <Plus size={12} /> Yeni Kateqoriya
          </button>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Məhsul</th>
                <th>Kateqoriya</th>
                <th>SKU</th>
                <th>Stok</th>
                <th>Min Stok</th>
                <th>Alış {csym}</th>
                <th>Satış {csym}</th>
                <th>Mənfəət %</th>
                <th>Stok dəyəri</th>
                <th>Təchizatçı</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16">
                  <div className="empty-state">
                    <Package size={36} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Məhsul tapılmadı</p>
                  </div>
                </td></tr>
              ) : products.map(p => {
                const isLow = p.stock_qty <= p.min_stock;
                return (
                  <tr key={p.id} className={isLow ? 'bg-amber-900/5' : ''}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                          <Package size={13} className="text-dark-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{p.name}</p>
                          {p.barcode && <p className="text-xs text-dark-500 font-mono">{p.barcode}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.category_name ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={p.category_color ? { backgroundColor: p.category_color + '25', color: p.category_color } : { backgroundColor: '#1e293b', color: '#94a3b8' }}>
                          {p.category_name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="font-mono text-xs text-dark-400">{p.sku || '—'}</td>
                    <td>
                      <div className={`flex items-center gap-1.5 font-semibold ${isLow ? 'text-amber-400' : 'text-white'}`}>
                        {isLow && <AlertTriangle size={12} />}
                        {p.stock_qty} {p.unit}
                      </div>
                    </td>
                    <td className="text-dark-400 text-xs">{p.min_stock} {p.unit}</td>
                    <td className="text-dark-300">{fmt(p.buy_price)}</td>
                    <td className="font-semibold text-emerald-400">{fmt(p.sell_price)}</td>
                    <td>
                      {p.buy_price > 0 ? (() => {
                        const margin = ((p.sell_price - p.buy_price) / p.buy_price) * 100;
                        const cls = margin >= 30 ? 'text-emerald-400' : margin >= 10 ? 'text-amber-400' : 'text-red-400';
                        return <span className={`text-xs font-bold ${cls}`}>{margin.toFixed(1)}%</span>;
                      })() : <span className="text-dark-600">—</span>}
                    </td>
                    <td className="text-dark-300">{fmt(p.stock_qty * p.sell_price)}</td>
                    <td className="text-dark-400 text-xs">{p.supplier_name || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setStockModal(p); setStockType('in'); setStockQty(''); }}
                          className="btn-icon w-7 h-7 hover:bg-emerald-900/30 hover:text-emerald-400" title="Stok giriş">
                          <ArrowDown size={13} />
                        </button>
                        <button onClick={() => { setStockModal(p); setStockType('out'); setStockQty(''); }}
                          className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400" title="Stok çıxış">
                          <ArrowUp size={13} />
                        </button>
                        <button onClick={() => openEdit(p)} className="btn-icon w-7 h-7"><Edit3 size={13} /></button>
                        <button onClick={() => setDeleteId(p.id)} className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul'} size="lg"
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
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Məhsul adı *</label>
            <input className="input-field" placeholder="Motor yağı 5W-40" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Kateqoriya</label>
            <select className="select-field" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">— Seçin —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ölçü vahidi</label>
            <select className="select-field" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">SKU / Məhsul kodu</label>
            <input className="input-field" placeholder="YAG-5W40-1L" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          </div>
          <div>
            <label className="label">Barkod</label>
            <input className="input-field" placeholder="1234567890" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
          </div>
          <div>
            <label className="label">Alış qiyməti ({csym})</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))} />
          </div>
          <div>
            <label className="label">Satış qiyməti ({csym})</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} />
          </div>
          <div>
            <label className="label">Stok miqdarı</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} />
          </div>
          <div>
            <label className="label">Min stok limiti</label>
            <input type="number" min="0" step="0.01" className="input-field" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Təchizatçı</label>
            <select className="select-field" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
              <option value="">— Seçin —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Qeyd</label>
            <input className="input-field" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={stockType === 'in' ? 'Stok Giriş' : 'Stok Çıxış'} size="sm"
        footer={
          <>
            <button onClick={() => setStockModal(null)} className="btn-secondary">Ləğv et</button>
            <button onClick={handleStockAction} disabled={stockSaving}
              className={stockType === 'in' ? 'btn-success' : 'btn-danger'}>
              {stockSaving ? <Loader2 size={14} className="animate-spin" /> : stockType === 'in' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              {stockType === 'in' ? 'Anbara əlavə et' : 'Anbardan çıxar'}
            </button>
          </>
        }
      >
        {stockModal && (
          <div className="space-y-4">
            <div className="card p-3">
              <p className="text-sm font-semibold text-white">{stockModal.name}</p>
              <p className="text-xs text-dark-400 mt-0.5">Mövcud stok: <span className="text-white font-medium">{stockModal.stock_qty} {stockModal.unit}</span></p>
            </div>
            <div>
              <label className="label">Miqdar ({stockModal.unit})</label>
              <input type="number" min="0.01" step="0.01" className="input-field" value={stockQty} onChange={e => setStockQty(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Qeyd</label>
              <input className="input-field" placeholder="Səbəb, mənbə..." value={stockNote} onChange={e => setStockNote(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Yeni Kateqoriya" size="sm"
        footer={
          <>
            <button onClick={() => setCatModalOpen(false)} className="btn-secondary">Ləğv et</button>
            <button onClick={handleAddCategory} className="btn-primary"><Save size={14} /> Əlavə et</button>
          </>
        }
      >
        <div className="space-y-3">
          <div><label className="label">Kateqoriya adı</label><input className="input-field" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus /></div>
          <div className="flex items-center gap-3">
            <label className="label mb-0">Rəng</label>
            <input type="color" className="w-10 h-9 rounded cursor-pointer border-none bg-transparent" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} />
            <span className="text-xs text-dark-400">{newCatColor}</span>
          </div>
        </div>
      </Modal>

      <Modal open={importModal} onClose={() => { setImportModal(false); setImportRows([]); }} title="CSV-dən Məhsul Import" size="md"
        footer={
          <>
            <button onClick={() => { setImportModal(false); setImportRows([]); }} className="btn-secondary">Ləğv et</button>
            <button onClick={handleImport} disabled={importLoading || !importRows.length} className="btn-primary">
              {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              {importRows.length > 0 ? `${importRows.length} məhsul import et` : 'Fayl seçin'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-dark-700 border border-dark-600 rounded-xl p-4 text-xs text-dark-300 space-y-1.5">
            <p className="font-semibold text-white">CSV fayl formatı:</p>
            <p className="font-mono text-emerald-400">name,buy_price,sell_price,stock_qty,min_stock,unit</p>
            <p>və ya Azərbaycan sütunları:</p>
            <p className="font-mono text-emerald-400">Ad,Alış qiyməti,Satış qiyməti,Stok,Min stok,Vahid</p>
          </div>
          <div>
            <label className="label">CSV faylı seçin</label>
            <input type="file" accept=".csv,.txt" onChange={handleImportFile}
              className="w-full text-xs text-dark-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:bg-primary-600 file:text-white hover:file:bg-primary-700 cursor-pointer" />
          </div>
          {importRows.length > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-3">
              <p className="text-xs text-emerald-400 font-semibold mb-2">✓ {importRows.length} məhsul hazırdır</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importRows.slice(0, 8).map((r, i) => (
                  <p key={i} className="text-xs text-dark-300">
                    {r.name || r.Ad}
                    {(r.sell_price || r['Satış qiyməti']) ? ` · ${r.sell_price || r['Satış qiyməti']} ${csym}` : ''}
                  </p>
                ))}
                {importRows.length > 8 && <p className="text-xs text-dark-500">... və {importRows.length - 8} digər</p>}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Məhsulu Sil" message="Bu məhsulu silmək istədiyinizə əminsiniz? Bütün stok hərəkətləri də silinəcək." loading={deleteLoading} />
    </div>
  );
}
