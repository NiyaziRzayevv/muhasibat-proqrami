import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard,
  Banknote, ArrowLeftRight, UserCheck, X, CheckCircle,
  Printer, Tag, Package, AlertCircle, ChevronDown, Keyboard,
  Grid3X3, LayoutList, Zap, Star, BarChart2, Clock, TrendingUp, FileText
} from 'lucide-react';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { apiBridge } from '../api/bridge';
import { getCurrencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CAT_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444',
  '#06b6d4','#f97316','#ec4899','#84cc16','#6366f1',
];

function getPaymentMethods(t) {
  return [
    { value: 'cash', label: t('cash'), icon: Banknote },
    { value: 'card', label: t('card'), icon: CreditCard },
    { value: 'transfer', label: t('transfer'), icon: ArrowLeftRight },
    { value: 'debt', label: t('statusDebt'), icon: UserCheck },
    { value: 'partial', label: t('statusPartial'), icon: ChevronDown },
  ];
}

function fmt(n) {
  return Number(n || 0).toFixed(2);
}

export default function POS() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const PAYMENT_METHODS = getPaymentMethods(t);
  const userId = isAdmin ? null : currentUser?.id;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [editQtyId, setEditQtyId] = useState(null);
  const [editQtyVal, setEditQtyVal] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos_pinned') || '[]'); } catch { return []; }
  });
  const [showEOD, setShowEOD] = useState(false);
  const [eodData, setEodData] = useState(null);
  const [eodLoading, setEodLoading] = useState(false);
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadCategories();
    barcodeRef.current?.focus();
  }, [userId]);

  const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const paid = parseFloat(paidAmount) || total;
  const change = paid - total;
  const debt = paymentMethod === 'partial' ? Math.max(0, total - paid) :
               paymentMethod === 'debt' ? total : 0;

  async function loadProducts() {
    const res = await apiBridge.getProducts({ userId });
    if (res.success) setProducts(res.data || []);
  }

  async function loadCustomers() {
    const res = await apiBridge.getCustomers('', userId);
    if (res.success) setCustomers(res.data || []);
  }

  async function loadCategories() {
    const res = await apiBridge.getCategories(userId);
    if (res.success) setCategories(res.data || []);
  }

  async function downloadReceiptPdf(saleId) {
    const res = await apiRequest(`/sales/${saleId}`, { token: getToken() });
    if (!res.success) throw new Error(res.error || 'Xəta');
    const sale = res.data;

    const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14);
    doc.text(`Satış #${sale.id}`, 14, 14);
    doc.setFontSize(10);
    doc.text(`Tarix: ${sale.date || ''} ${sale.time || ''}`.trim(), 14, 20);
    if (sale.customer_name) doc.text(`Müştəri: ${sale.customer_name}`, 14, 25);

    const rows = (sale.items || []).map(it => ([
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
      headStyles: { fillColor: [16, 185, 129] },
    });

    const y = (doc.lastAutoTable?.finalY || 30) + 10;
    doc.setFontSize(10);
    doc.text(`Ümumi: ${fmt(sale.total)}`, 14, y);
    doc.text(`Ödənilib: ${fmt(sale.paid_amount)}`, 14, y + 5);
    doc.text(`Status: ${sale.payment_status || ''}`, 14, y + 10);
    doc.save(`satis-${sale.id}.pdf`);
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchCat = selectedCat === 'all' || String(p.category_id) === String(selectedCat);
    return matchSearch && matchCat;
  });

  function addToCart(product) {
    if (product.stock_qty <= 0) {
      showNotification(`${product.name} stokda yoxdur`, 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock_qty) {
          showNotification('Stok kifayət etmir', 'error');
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1, unit_price: product.sell_price }];
    });
  }

  function handleBarcodeInput(e) {
    if (e.key === 'Enter') {
      const barcode = barcodeInput.trim();
      if (!barcode) return;
      const product = products.find(p => p.barcode === barcode || p.sku === barcode);
      if (product) {
        addToCart(product);
        showNotification(`${product.name} əlavə edildi`, 'success');
      } else {
        showNotification('Məhsul tapılmadı: ' + barcode, 'error');
      }
      setBarcodeInput('');
    }
  }

  function updateQty(id, delta) {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.qty + delta;
      if (newQty <= 0) return null;
      if (newQty > i.stock_qty) { showNotification('Stok kifayət etmir', 'error'); return i; }
      return { ...i, qty: newQty };
    }).filter(Boolean));
  }

  function setQtyDirect(id, val) {
    const n = parseInt(val) || 1;
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (n <= 0) return null;
      if (n > i.stock_qty) { showNotification('Stok kifayət etmir', 'error'); return i; }
      return { ...i, qty: n };
    }).filter(Boolean));
    setEditQtyId(null);
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  function updatePrice(id, price) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, unit_price: parseFloat(price) || 0 } : i));
  }

  async function handleCheckout() {
    if (cart.length === 0) { showNotification('Səbət boşdur', 'error'); return; }
    setProcessing(true);
    try {
      const saleData = {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
        customer_id: customer?.id || null,
        customer_name: customer?.name || null,
        items: cart.map(i => ({
          product_id: i.id,
          product_name: i.name,
          qty: i.qty,
          unit_price: i.unit_price,
          total: i.qty * i.unit_price,
        })),
        subtotal,
        discount: discountAmt,
        total,
        payment_status: paymentMethod === 'debt' ? 'gozleyir' :
                        paymentMethod === 'partial' ? 'qismen' : 'odenilib',
        paid_amount: paymentMethod === 'debt' ? 0 :
                     paymentMethod === 'partial' ? (parseFloat(paidAmount) || 0) : total,
        payment_method: paymentMethod,
        notes: paymentMethod === 'partial' ? `Qalıq: ${fmt(debt)} {csym}` : null,
        created_by: currentUser?.id || null,
      };

      const res = await apiBridge.createSale(saleData);
      if (res.success) {
        setLastSale({ ...res.data, change: Math.max(0, change) });
        showNotification('Satış tamamlandı!', 'success');
        setCart([]);
        setDiscount(0);
        setPaidAmount('');
        setPaymentMethod('cash');
        setCustomer(null);
        await loadProducts();
      } else {
        showNotification(res.error || 'Satış uğursuz oldu', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (lastSale && e.key === 'Escape') { setLastSale(null); barcodeRef.current?.focus(); return; }
      if (e.key === 'F2') { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === 'F3') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0 && !processing) handleCheckout(); }
      if (e.key === 'F10') { e.preventDefault(); setCart([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lastSale, cart, processing]);

  function togglePin(id) {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('pos_pinned', JSON.stringify(next));
      return next;
    });
  }

  async function loadEOD() {
    setEodLoading(true);
    setShowEOD(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiBridge.getSales({ startDate: today, endDate: today, userId });
      if (res.success) setEodData(res.data || []);
    } catch (e) { console.error(e); }
    finally { setEodLoading(false); }
  }

  async function printReceipt(saleId) {
    try {
      if (window.api?.generateSaleReceipt) {
        const res = await window.api.generateSaleReceipt(saleId);
        if (res.success) {
          showNotification('Qəbz hazırlandı', 'success');
          window.api.showItemInFolder(res.path);
        } else {
          showNotification(res.error || 'Qəbz xətası', 'error');
        }
      } else {
        await downloadReceiptPdf(saleId);
        showNotification('Qəbz hazırlandı', 'success');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    }
  }

  const filtCustomers = customers.filter(c =>
    !customerSearch ||
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-dark-800">
        {/* Search + Barcode */}
        <div className="p-3 border-b border-dark-800 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 text-sm"
                placeholder="Axtar... (F3)" />
            </div>
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input ref={barcodeRef} type="text" value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeInput}
                className="w-full bg-dark-800/50 border border-dark-700/50 rounded-xl pl-9 pr-3 py-2 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="Barkod (F2)" />
            </div>
            <div className="flex gap-1">
              <button onClick={() => setViewMode('grid')} title="Grid"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${ viewMode==='grid' ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-800 text-dark-500 hover:text-white'}`}>
                <Grid3X3 size={13} />
              </button>
              <button onClick={() => setViewMode('list')} title="List"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${ viewMode==='list' ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-800 text-dark-500 hover:text-white'}`}>
                <LayoutList size={13} />
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            <button onClick={() => setSelectedCat('all')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${ selectedCat==='all' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:text-white'}`}>
              Hamısı ({products.length})
            </button>
            {categories.map((cat, ci) => {
              const count = products.filter(p => String(p.category_id) === String(cat.id)).length;
              return (
                <button key={cat.id} onClick={() => setSelectedCat(String(cat.id))}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    selectedCat === String(cat.id)
                      ? 'text-white border-transparent'
                      : 'bg-dark-800 text-dark-400 border-transparent hover:text-white'
                  }`}
                  style={selectedCat === String(cat.id) ? { backgroundColor: cat.color || CAT_COLORS[ci % CAT_COLORS.length], borderColor: 'transparent' } : {}}>
                  {cat.name} {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Keyboard hints */}
          <div className="flex gap-3 text-[10px] text-dark-600">
            <span><kbd className="bg-dark-800 px-1 rounded text-dark-500">F2</kbd> Barkod</span>
            <span><kbd className="bg-dark-800 px-1 rounded text-dark-500">F3</kbd> Axtar</span>
            <span><kbd className="bg-dark-800 px-1 rounded text-dark-500">F9</kbd> Ödə</span>
            <span><kbd className="bg-dark-800 px-1 rounded text-dark-500">F10</kbd> Sil</span>
            <span><kbd className="bg-dark-800 px-1 rounded text-dark-500">Esc</kbd> Bağla</span>
          </div>
        </div>

        {/* Quick Access Pinned Products */}
        {pinnedIds.length > 0 && (
          <div className="px-3 py-2 border-b border-dark-800 bg-dark-900/50">
            <p className="text-[9px] text-dark-600 uppercase font-semibold mb-1.5 flex items-center gap-1">
              <Zap size={9} className="text-amber-500" /> Sürətli Seçim
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {pinnedIds.map(pid => {
                const p = products.find(x => x.id === pid);
                if (!p) return null;
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <button key={pid} onClick={() => addToCart(p)} disabled={p.stock_qty <= 0}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 border ${
                      p.stock_qty <= 0 ? 'opacity-40 cursor-not-allowed bg-dark-800 border-dark-700 text-dark-500' :
                      inCart ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' :
                      'bg-dark-800 border-dark-600 text-white hover:bg-dark-700 hover:border-primary-500/50'
                    }`}>
                    <Zap size={10} className="text-amber-400 flex-shrink-0" />
                    <span className="truncate max-w-[100px]">{p.name}</span>
                    <span className="text-primary-400 font-bold">{fmt(p.sell_price)}{csym}</span>
                    {inCart && <span className="bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">{inCart.qty}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Grid / List */}
        <div className="flex-1 overflow-y-auto p-3">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((p, pi) => {
                const cat = categories.find(c => String(c.id) === String(p.category_id));
                const catColor = cat?.color || CAT_COLORS[categories.indexOf(cat) % CAT_COLORS.length] || '#3b82f6';
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock_qty <= 0}
                    className={`relative text-left p-3 rounded-xl border transition-all duration-150 active:scale-95 group ${
                      p.stock_qty <= 0
                        ? 'bg-dark-900/30 border-dark-800/30 opacity-40 cursor-not-allowed'
                        : inCart
                        ? 'bg-dark-800 border-primary-500/60 shadow-sm shadow-primary-500/10'
                        : 'bg-dark-900 border-dark-800 hover:border-dark-600 hover:bg-dark-800'}`}>
                    {inCart && (
                      <span className="absolute top-1.5 right-1.5 bg-primary-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{inCart.qty}</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(p.id); }}
                      className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all z-10 ${
                        pinnedIds.includes(p.id)
                          ? 'text-amber-400 bg-amber-500/20 opacity-100'
                          : 'text-dark-700 bg-dark-800/80 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                      }`}
                      title={pinnedIds.includes(p.id) ? 'Sürətli seçimdən çıxar' : 'Sürətli seçimə əlavə et'}>
                      <Star size={10} fill={pinnedIds.includes(p.id) ? 'currentColor' : 'none'} />
                    </button>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: catColor + '22' }}>
                        <Package size={13} style={{ color: catColor }} />
                      </div>
                      <p className="text-xs font-medium text-white leading-tight line-clamp-2 flex-1">{p.name}</p>
                    </div>
                    {cat && (
                      <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mb-1.5" style={{ backgroundColor: catColor + '22', color: catColor }}>{cat.name}</span>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-primary-400">{fmt(p.sell_price)} {csym}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        p.stock_qty <= 0 ? 'bg-red-900/40 text-red-400' :
                        p.stock_qty <= p.min_stock ? 'bg-amber-900/40 text-amber-400' :
                        'bg-dark-800 text-dark-500'}`}>
                        {p.stock_qty} {p.unit || 'əd'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProducts.map((p) => {
                const cat = categories.find(c => String(c.id) === String(p.category_id));
                const catColor = cat?.color || '#3b82f6';
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock_qty <= 0}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      p.stock_qty <= 0
                        ? 'bg-dark-900/30 border-dark-800/30 opacity-40 cursor-not-allowed'
                        : inCart
                        ? 'bg-dark-800 border-primary-500/50'
                        : 'bg-dark-900 border-dark-800 hover:border-dark-600 hover:bg-dark-800'}`}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: catColor + '25' }}>
                      <Package size={11} style={{ color: catColor }} />
                    </div>
                    <span className="flex-1 text-xs font-medium text-white text-left truncate">{p.name}</span>
                    {cat && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor + '22', color: catColor }}>{cat.name}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      p.stock_qty <= 0 ? 'bg-red-900/40 text-red-400' :
                      p.stock_qty <= p.min_stock ? 'bg-amber-900/40 text-amber-400' : 'bg-dark-800 text-dark-500'}`}>
                      {p.stock_qty}
                    </span>
                    <span className="text-sm font-bold text-primary-400 flex-shrink-0 w-16 text-right">{fmt(p.sell_price)} {csym}</span>
                    {inCart && <span className="bg-primary-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">{inCart.qty}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {filteredProducts.length === 0 && (
            <div className="text-center py-16 text-dark-500">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Məhsul tapılmadı</p>
              {selectedCat !== 'all' && (
                <button onClick={() => setSelectedCat('all')} className="mt-2 text-xs text-primary-400 hover:text-primary-300">Hamısını göstər</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-96 flex flex-col bg-dark-950">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-primary-400" />
            <span className="font-semibold text-white text-sm">Səbət</span>
            {cart.length > 0 && (
              <span className="bg-primary-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cart.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEOD} title="Gün Sonu Hesabat"
              className="flex items-center gap-1 text-xs text-dark-400 hover:text-amber-400 transition-colors bg-dark-800 hover:bg-dark-700 px-2 py-1 rounded-lg">
              <BarChart2 size={11} /> Gün sonu
            </button>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Təmizlə
              </button>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="px-4 py-2 border-b border-dark-800">
          {customer ? (
            <div className="flex items-center justify-between bg-dark-800 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-emerald-400" />
                <span className="text-sm text-white">{customer.name}</span>
              </div>
              <button onClick={() => setCustomer(null)} className="text-dark-500 hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              className="w-full text-left text-xs text-dark-500 hover:text-dark-300 transition-colors py-1"
            >
              + Müştəri seç (opsional)
            </button>
          )}
          {showCustomerSearch && !customer && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-xs placeholder-dark-500 focus:outline-none focus:border-primary-500"
                placeholder="Müştəri axtar..."
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filtCustomers.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                    className="w-full text-left px-3 py-1.5 bg-dark-800 hover:bg-dark-700 rounded-lg text-xs text-white transition-colors"
                  >
                    {c.name} {c.phone ? `· ${c.phone}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-600">
              <ShoppingCart size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Məhsul seçin</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-dark-900 border border-dark-800 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-white leading-tight flex-1 mr-2">{item.name}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-dark-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-dark-800 hover:bg-dark-700 text-white rounded-lg flex items-center justify-center transition-colors">
                      <Minus size={12} />
                    </button>
                    {editQtyId === item.id ? (
                    <input type="number" value={editQtyVal} autoFocus min="1" max={item.stock_qty}
                      onChange={e => setEditQtyVal(e.target.value)}
                      onBlur={() => setQtyDirect(item.id, editQtyVal)}
                      onKeyDown={e => { if (e.key === 'Enter') setQtyDirect(item.id, editQtyVal); if (e.key === 'Escape') setEditQtyId(null); }}
                      className="w-10 text-center text-sm font-bold text-white bg-dark-700 border border-primary-500 rounded focus:outline-none" />
                  ) : (
                    <span onClick={() => { setEditQtyId(item.id); setEditQtyVal(String(item.qty)); }}
                      className="w-8 text-center text-sm font-bold text-white cursor-pointer hover:text-primary-400 transition-colors" title="Kliklə dəyiştir">{item.qty}</span>
                  )}
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-dark-800 hover:bg-dark-700 text-white rounded-lg flex items-center justify-center transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={e => updatePrice(item.id, e.target.value)}
                    className="w-20 bg-dark-800 border border-dark-700 rounded-lg px-2 py-1 text-xs text-right text-white focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-sm font-bold text-primary-400 w-20 text-right">
                    {fmt(item.qty * item.unit_price)} {csym}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount */}
        {cart.length > 0 && (
          <div className="px-4 py-2 border-t border-dark-800">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-dark-500" />
              <span className="text-xs text-dark-400">Endirim:</span>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-right text-sm text-white focus:outline-none focus:border-primary-500"
                min="0"
                max={subtotal}
              />
              <span className="text-xs text-dark-400">{csym}</span>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-4 py-3 border-t border-dark-800 space-y-1.5">
          <div className="flex justify-between text-sm text-dark-400">
            <span>Ara cəm:</span>
            <span>{fmt(subtotal)} {csym}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-sm text-emerald-400">
              <span>Endirim:</span>
              <span>-{fmt(discountAmt)} {csym}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-white text-base pt-1 border-t border-dark-800">
            <span>YEKUN:</span>
            <span className="text-primary-400">{fmt(total)} {csym}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="px-4 py-3 border-t border-dark-800">
          <div className="grid grid-cols-5 gap-1 mb-3">
            {PAYMENT_METHODS.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all
                    ${paymentMethod === m.value
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                      : 'bg-dark-800 text-dark-400 hover:text-white border border-transparent'}`}
                >
                  <Icon size={14} />
                  <span className="text-[10px]">{m.label}</span>
                </button>
              );
            })}
          </div>

          {(paymentMethod === 'cash' || paymentMethod === 'partial') && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-400 w-20">Alınan:</span>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-right text-sm text-white focus:outline-none focus:border-primary-500"
                  placeholder={fmt(total)}
                />
                <span className="text-xs text-dark-400">{csym}</span>
              </div>
              {(paymentMethod === 'cash' || paymentMethod === 'partial') && paidAmount && parseFloat(paidAmount) > total && (
                <div className="flex justify-between text-sm text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2 border border-emerald-700/30">
                  <span className="font-medium">💵 Qaytarılacaq:</span>
                  <span className="font-black text-base">{fmt(parseFloat(paidAmount) - total)} {csym}</span>
                </div>
              )}
              {paymentMethod === 'partial' && debt > 0 && (
                <div className="flex justify-between text-sm text-amber-400 bg-amber-900/10 rounded-lg px-3 py-1.5">
                  <span>Qalan borc:</span>
                  <span className="font-bold">{fmt(debt)} {csym}</span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'debt' && (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-900/10 rounded-xl px-3 py-2 text-xs">
              <AlertCircle size={14} />
              <span>Bütün məbləğ borc olaraq qeydə alınacaq</span>
            </div>
          )}
        </div>

        {/* Checkout Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-500/20 text-base"
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={20} />
                Satışı Tamamla · {fmt(total)} {csym}
              </>
            )}
          </button>
        </div>
      </div>

      {/* EOD Report Modal */}
      {showEOD && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <BarChart2 size={18} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="font-bold text-white">Gün Sonu Hesabatı</h2>
                  <p className="text-xs text-dark-400">{new Date().toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <button onClick={() => setShowEOD(false)} className="text-dark-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {eodLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="loading-spinner w-8 h-8" />
                </div>
              ) : !eodData || eodData.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={36} className="mx-auto mb-3 text-dark-600" />
                  <p className="text-dark-400">Bu gün satış yoxdur</p>
                </div>
              ) : (() => {
                const totalRevenue = eodData.reduce((s, x) => s + (x.total || 0), 0);
                const totalPaid = eodData.reduce((s, x) => s + (x.paid_amount || 0), 0);
                const totalDebt = totalRevenue - totalPaid;
                const cashSales = eodData.filter(x => x.payment_method === 'cash').reduce((s, x) => s + (x.paid_amount || 0), 0);
                const cardSales = eodData.filter(x => x.payment_method === 'card').reduce((s, x) => s + (x.paid_amount || 0), 0);
                const methodCounts = eodData.reduce((acc, x) => {
                  const m = x.payment_method || 'digər';
                  acc[m] = (acc[m] || 0) + 1;
                  return acc;
                }, {});
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-dark-800 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-400 mb-1">Satış sayı</p>
                        <p className="text-2xl font-black text-white">{eodData.length}</p>
                      </div>
                      <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-dark-400 mb-1">Ümumi gəlir</p>
                        <p className="text-xl font-black text-emerald-400">{fmt(totalRevenue)} {csym}</p>
                      </div>
                      {totalDebt > 0 && (
                        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-dark-400 mb-1">Ödənilməyən</p>
                          <p className="text-xl font-black text-red-400">{fmt(totalDebt)} {csym}</p>
                        </div>
                      )}
                      {totalDebt === 0 && (
                        <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-dark-400 mb-1">Ödənilən</p>
                          <p className="text-xl font-black text-blue-400">{fmt(totalPaid)} {csym}</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-dark-800 rounded-xl p-4">
                      <p className="text-xs font-semibold text-dark-400 uppercase mb-3">Ödəniş üsulları</p>
                      <div className="space-y-2">
                        {[
                          { key: 'cash', label: 'Nağd', color: 'text-emerald-400', value: cashSales },
                          { key: 'card', label: 'Kart', color: 'text-blue-400', value: cardSales },
                        ].concat(
                          Object.entries(methodCounts)
                            .filter(([m]) => m !== 'cash' && m !== 'card')
                            .map(([m, c]) => ({
                              key: m, color: 'text-amber-400',
                              label: { transfer: 'Köçürmə', debt: 'Borc', partial: 'Qismən' }[m] || m,
                              value: eodData.filter(x => x.payment_method === m).reduce((s, x) => s + (x.paid_amount || 0), 0)
                            }))
                        ).filter(x => x.value > 0).map(m => (
                          <div key={m.key} className="flex items-center justify-between">
                            <span className="text-sm text-dark-300">{m.label}</span>
                            <span className={`font-bold text-sm ${m.color}`}>{fmt(m.value)} {csym}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-dark-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 border-b border-dark-700">
                        <p className="text-xs font-semibold text-dark-400 uppercase">Son satışlar</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-dark-700">
                        {[...eodData].reverse().slice(0, 10).map(s => (
                          <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                            <div>
                              <p className="text-xs text-white">{s.customer_name || 'Anonim'}</p>
                              <p className="text-[10px] text-dark-500">{s.time} · #{s.id}</p>
                            </div>
                            <span className="text-sm font-bold text-primary-400">{fmt(s.total)} {csym}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="px-6 pb-5 pt-3 border-t border-dark-800">
              <button onClick={() => setShowEOD(false)}
                className="w-full bg-dark-800 hover:bg-dark-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal — Full Receipt */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-t-2xl px-6 py-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white">Satış Tamamlandı!</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Qəbz #{lastSale.id} · {lastSale.date} {lastSale.time}
              </p>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Customer */}
              {lastSale.customer_name && (
                <div className="flex items-center gap-3 bg-dark-800 rounded-xl px-4 py-3">
                  <UserCheck size={16} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-dark-400 uppercase font-semibold">Müştəri</p>
                    <p className="text-sm font-semibold text-white">{lastSale.customer_name}</p>
                  </div>
                </div>
              )}

              {/* Payment Method Badge */}
              {(() => {
                const METHOD = {
                  cash:     { label: 'Nağd Ödəniş',   color: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/40', Icon: Banknote },
                  card:     { label: 'Kart ilə Ödəniş', color: 'bg-blue-500/20 text-blue-300 border-blue-700/40',    Icon: CreditCard },
                  transfer: { label: 'Bank Köçürməsi', color: 'bg-violet-500/20 text-violet-300 border-violet-700/40', Icon: ArrowLeftRight },
                  debt:     { label: 'Borc (Ödənilməyib)', color: 'bg-red-500/20 text-red-300 border-red-700/40',    Icon: AlertCircle },
                  partial:  { label: 'Qismən Ödəniş',  color: 'bg-amber-500/20 text-amber-300 border-amber-700/40',  Icon: ChevronDown },
                };
                const m = METHOD[lastSale.payment_method] || METHOD.cash;
                const Icon = m.Icon;
                return (
                  <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${m.color}`}>
                    <Icon size={18} className="flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold opacity-70">Ödəniş üsulu</p>
                      <p className="text-sm font-bold">{m.label}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Items List */}
              <div className="bg-dark-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-dark-700">
                  <p className="text-[10px] text-dark-400 uppercase font-semibold">Satılan məhsullar</p>
                </div>
                <div className="divide-y divide-dark-700">
                  {(lastSale.items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm text-white font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-dark-400">{item.qty} × {fmt(item.unit_price)} {csym}</p>
                      </div>
                      <span className="text-sm font-bold text-primary-400 flex-shrink-0">{fmt(item.total)} {csym}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amounts Summary */}
              <div className="bg-dark-800 rounded-xl px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm text-dark-400">
                  <span>Ara cəm:</span>
                  <span className="text-white">{fmt(lastSale.subtotal)} {csym}</span>
                </div>
                {(lastSale.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Endirim:</span>
                    <span>−{fmt(lastSale.discount)} {csym}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base border-t border-dark-700 pt-2 mt-2">
                  <span className="text-dark-300">YEKUN:</span>
                  <span className="text-white">{fmt(lastSale.total)} {csym}</span>
                </div>
                {(lastSale.paid_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Ödənilən:</span>
                    <span className="font-bold">{fmt(lastSale.paid_amount)} {csym}</span>
                  </div>
                )}
                {lastSale.change > 0 && (
                  <div className="flex justify-between text-sm bg-emerald-900/20 rounded-lg px-3 py-2 mt-1">
                    <span className="text-emerald-300 font-semibold">💵 Qaytarılacaq:</span>
                    <span className="text-emerald-300 font-black">{fmt(lastSale.change)} {csym}</span>
                  </div>
                )}
                {(() => {
                  const remaining = (lastSale.total || 0) - (lastSale.paid_amount || 0);
                  return remaining > 0 && lastSale.payment_method !== 'cash' && lastSale.payment_method !== 'card' && lastSale.payment_method !== 'transfer' ? (
                    <div className="flex justify-between text-sm bg-red-900/20 rounded-lg px-3 py-2 mt-1">
                      <span className="text-red-300 font-semibold">⚠ Qalan borc:</span>
                      <span className="text-red-300 font-black">{fmt(remaining)} {csym}</span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Notes */}
              {lastSale.notes && (
                <div className="bg-dark-800 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-dark-400 uppercase font-semibold mb-1">Qeyd</p>
                  <p className="text-sm text-dark-200">{lastSale.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 pb-6 pt-3 flex gap-3 border-t border-dark-800">
              <button
                onClick={() => printReceipt(lastSale.id)}
                className="flex-1 flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm border border-dark-700"
              >
                <Printer size={16} />
                PDF Qəbz
              </button>
              <button
                onClick={() => { setLastSale(null); barcodeRef.current?.focus(); }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/20"
              >
                ✓ Yeni Satış
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
