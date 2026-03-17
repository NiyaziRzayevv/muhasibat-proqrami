import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, Send, X, CheckCircle, AlertCircle,
  Wrench, Package, ArrowDown, ArrowUp, ShoppingCart, Users, Zap
} from 'lucide-react';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { getCurrencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';

function getIntentConfig(t) {
  return {
    servis:      { label: t('smartServiceRecord'), icon: Wrench,       color: 'blue',   bg: 'bg-blue-900/20 border-blue-700/40',   text: 'text-blue-400' },
    stok_giris:  { label: t('stockIn'),            icon: ArrowDown,    color: 'emerald',bg: 'bg-emerald-900/20 border-emerald-700/40', text: 'text-emerald-400' },
    stok_cixis:  { label: t('stockOut'),            icon: ArrowUp,      color: 'red',    bg: 'bg-red-900/20 border-red-700/40',     text: 'text-red-400' },
    satis:       { label: t('smartSale'),           icon: ShoppingCart, color: 'purple', bg: 'bg-purple-900/20 border-purple-700/40', text: 'text-purple-400' },
    musteri:     { label: t('smartNewCustomer'),     icon: Users,        color: 'amber',  bg: 'bg-amber-900/20 border-amber-700/40', text: 'text-amber-400' },
  };
}

const EXAMPLES = [
  'ekran dəyişmə 50 manat',
  'anbara 20 ədəd aksesuar gəldi',
  '3 ədəd qab satıldı',
  'Samsung telefon batareya dəyişmə',
  'yeni müştəri Əli Həsənov 055 123 45 67',
  'anbardan 5 ədəd ehtiyat hissə istifadə edildi',
];

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <input
        type={type}
        className="input-field h-8 text-xs"
        value={value || ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <select className="select-field h-8 text-xs" value={value || ''} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function UniversalSmartInput({ onDone, compact = false }) {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const INTENT_CONFIG = getIntentConfig(t);
  const userId = isAdmin ? null : currentUser?.id;
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({});
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDrop, setShowProductDrop] = useState(false);
  const inputRef = useRef(null);
  const [exampleIdx, setExampleIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setExampleIdx(i => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (window.api?.getProducts) {
        const r = await window.api.getProducts({ userId });
        if (r.success) setProducts(r.data);
      } else {
        try {
          const token = localStorage.getItem('auth_token') || '';
          const params = userId ? `?userId=${userId}` : '';
          const r = await apiRequest(`/products${params}`, { token });
          if (r.success) setProducts(r.data);
        } catch (e) { console.warn('Products load:', e.message); }
      }
    }
    loadProducts();
  }, []);

  const set = (key, val) => setFields(f => ({ ...f, [key]: val }));

  const parseWithAI = useCallback(async () => {
    if (!input.trim()) return;
    setParsing(true); setError(null); setResult(null);
    try {
      let res;
      if (window.api?.parseUniversal) {
        res = await window.api.parseUniversal(input.trim());
      } else {
        try {
          const token = localStorage.getItem('auth_token') || '';
          res = await apiRequest('/parse/universal', { method: 'POST', token, body: { text: input.trim() } });
        } catch (e) {
          setError(t('error') + ': ' + e.message);
          return;
        }
      }
      if (res.success) {
        const data = { ...res.data };

        // Auto-match product hint against the loaded products list
        if (data.product_name && products.length > 0) {
          const hint = data.product_name.toLowerCase().trim();
          const normalize = s => s.toLowerCase()
            .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
            .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
          const normHint = normalize(hint);

          const matched = products.find(p => {
            const normName = normalize(p.name);
            return normName.includes(normHint) || normHint.includes(normName) ||
              normHint.split(' ').some(word => word.length > 2 && normName.includes(word));
          });

          if (matched) {
            data.product_id = matched.id;
            setProductSearch(matched.name);
            if (!data.sell_price) data.sell_price = matched.sell_price;
            if (!data.buy_price) data.buy_price = matched.buy_price;
            if (!data.unit) data.unit = matched.unit;
          } else {
            setProductSearch(data.product_name);
          }
        }

        // For satis: map AI's generic 'price' field → sell_price
        if (data.intent === 'satis' && !data.sell_price && data.price) {
          data.sell_price = data.price;
        }

        setResult(res);
        setFields(data);
      } else {
        setError(res.error || t('smartNotUnderstood'));
      }
    } catch (e) { setError(t('error') + ': ' + e.message); }
    finally { setParsing(false); }
  }, [input, products]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); result ? handleConfirm() : parseWithAI(); }
    if (e.key === 'Escape') { setResult(null); setError(null); }
  };

  // Returns product_id — uses existing if found, auto-creates if not
  async function getOrCreateProduct(pid, name, unit, buyPrice, sellPrice) {
    if (pid) return { id: parseInt(pid), created: false };
    if (!name || !name.trim()) return null;

    // Try one more fuzzy match before creating
    const normalize = s => s.toLowerCase()
      .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ş/g, 'sh').replace(/ç/g, 'c').replace(/ğ/g, 'g');
    const normHint = normalize(name.trim());
    const found = products.find(p => {
      const n = normalize(p.name);
      return n.includes(normHint) || normHint.includes(n) ||
        normHint.split(' ').some(w => w.length > 2 && n.includes(w));
    });
    if (found) return { id: found.id, created: false, product: found };

    // Auto-create with minimal info
    let res;
    if (window.api?.createProduct) {
      res = await window.api.createProduct({
        name: name.trim(),
        unit: unit || 'ədəd',
        buy_price: buyPrice || 0,
        created_by: currentUser?.id || null,
        sell_price: sellPrice || 0,
        stock_qty: 0,
        min_stock: 0,
      });
    } else {
      const token = localStorage.getItem('auth_token') || '';
      res = await apiRequest('/products', { method: 'POST', token, body: {
        name: name.trim(), unit: unit || 'ədəd',
        buy_price: buyPrice || 0, sell_price: sellPrice || 0,
        stock_qty: 0, min_stock: 0,
      }});
    }
    if (res.success) {
      // Refresh local products list
      let updated;
      if (window.api?.getProducts) {
        updated = await window.api.getProducts({ userId });
      } else {
        const token = localStorage.getItem('auth_token') || '';
        const params = userId ? `?userId=${userId}` : '';
        updated = await apiRequest(`/products${params}`, { token });
      }
      if (updated.success) setProducts(updated.data);
      return { id: res.data.id, created: true, product: res.data };
    }
    return null;
  }

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const intent = fields.intent;
      const data = fields;

      if (intent === 'servis') {
        let res;
        if (window.api?.createFromParsed) {
          res = await window.api.createFromParsed(data, { created_by: currentUser?.id || null });
        } else {
          const token = localStorage.getItem('auth_token') || '';
          res = await apiRequest('/records', { method: 'POST', token, body: {
            date: data.date || new Date().toISOString().split('T')[0],
            customerName: data.customer_name || null,
            carBrand: data.car_brand || null,
            carModel: data.car_model || null,
            carPlate: data.car_plate || null,
            serviceType: data.service_type || null,
            totalPrice: data.price || 0,
            paidAmount: data.paid_amount || 0,
            paymentStatus: data.payment_status || 'gozleyir',
            notes: data.notes || null,
          }});
        }
        if (res.success) { showNotification(t('smartServiceAdded'), 'success'); reset(); onDone?.('records'); }
        else showNotification(res.error || t('error'), 'error');
      }

      else if (intent === 'stok_giris' || intent === 'stok_cixis') {
        const qty = parseFloat(fields.qty) || 0;
        if (qty <= 0) { showNotification(t('smartEnterQty'), 'error'); setSaving(false); return; }

        const productResult = await getOrCreateProduct(fields.product_id, fields.product_name || productSearch, fields.unit);
        if (!productResult) { showNotification(t('smartEnterProduct'), 'error'); setSaving(false); return; }

        const { id: pid, created, product } = productResult;
        let res;
        if (window.api?.stockIn) {
          res = intent === 'stok_giris'
            ? await window.api.stockIn(pid, qty, fields.notes || input, currentUser?.id)
            : await window.api.stockOut(pid, qty, fields.notes || input, currentUser?.id);
        } else {
          const token = localStorage.getItem('auth_token') || '';
          const body = { product_id: pid, qty, note: fields.notes || input };
          res = intent === 'stok_giris'
            ? await apiRequest('/stock/in', { method: 'POST', token, body })
            : await apiRequest('/stock/out', { method: 'POST', token, body });
        }

        if (res.success !== false) {
          const productName = product?.name || fields.product_name || productSearch;
          showNotification(
            `${created ? `"${productName}" ${t('createdSuccess')}. ` : ''}` +
            (intent === 'stok_giris' ? `${t('smartStockIncreased')}: +${qty}` : `${t('smartStockDecreased')}: -${qty}`),
            'success'
          );
          reset(); onDone?.('stock-movements');
        } else showNotification(res.error || t('error'), 'error');
      }

      else if (intent === 'satis') {
        const qty = parseFloat(fields.qty) || 0;
        if (qty <= 0) { showNotification(t('smartEnterQty'), 'error'); setSaving(false); return; }

        const effectiveSellPrice = parseFloat(fields.sell_price) || parseFloat(fields.price) || 0;
        const productResult = await getOrCreateProduct(
          fields.product_id, fields.product_name || productSearch,
          fields.unit, fields.buy_price, effectiveSellPrice
        );
        if (!productResult) { showNotification(t('smartEnterProduct'), 'error'); setSaving(false); return; }

        const { id: pid, created, product } = productResult;
        const unitPrice = parseFloat(fields.sell_price) || parseFloat(fields.price) || product?.sell_price || 0;
        let res;
        if (window.api?.createSale) {
          res = await window.api.createSale({
            date: fields.date || new Date().toISOString().split('T')[0],
            customer_name: fields.customer_name || null,
            payment_status: 'odenilib',
            items: [{ product_id: pid, product_name: product?.name || fields.product_name, qty, unit_price: unitPrice }],
            created_by: currentUser?.id || null,
          });
        } else {
          const token = localStorage.getItem('auth_token') || '';
          res = await apiRequest('/sales', {
            method: 'POST',
            token,
            body: {
              date: fields.date || new Date().toISOString().split('T')[0],
              customer_name: fields.customer_name || null,
              payment_status: 'odenilib',
              items: [{ product_id: pid, product_name: product?.name || fields.product_name, qty, unit_price: unitPrice }],
            }
          });
        }
        if (res.success) {
          const productName = product?.name || fields.product_name || productSearch;
          showNotification(
            `${created ? `"${productName}" ${t('createdSuccess')}. ` : ''}` +
            `${t('smartSaleRecorded')}: ${qty} → ${(qty * unitPrice).toFixed(2)} ${csym}`,
            'success'
          );
          reset(); onDone?.('sales');
        } else showNotification(res.error || t('error'), 'error');
      }

      else if (intent === 'musteri') {
        if (!data.customer_name) { showNotification(t('smartEnterName'), 'error'); setSaving(false); return; }
        let res;
        if (window.api?.createCustomer) {
          res = await window.api.createCustomer({ name: data.customer_name, phone: data.customer_phone || null, notes: data.notes || null, created_by: userId });
        } else {
          const token = localStorage.getItem('auth_token') || '';
          res = await apiRequest('/customers', { method: 'POST', token, body: {
            name: data.customer_name, phone: data.customer_phone || null, notes: data.notes || null,
          }});
        }
        if (res.success) { showNotification(t('smartCustomerAdded'), 'success'); reset(); onDone?.('customers'); }
        else showNotification(res.error || t('error'), 'error');
      }

    } catch (e) { showNotification(t('error') + ': ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  function reset() {
    setInput(''); setResult(null); setError(null); setFields({}); setProductSearch('');
    inputRef.current?.focus();
  }

  const intent = fields.intent;
  const cfg = INTENT_CONFIG[intent];
  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === parseInt(fields.product_id));

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            {parsing
              ? <Loader2 size={16} className="animate-spin text-primary-400" />
              : <Sparkles size={16} className="text-primary-400" />
            }
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (result) setResult(null); if (error) setError(null); }}
            onKeyDown={handleKey}
            placeholder={`${t('smartExamplePrefix')}: "${EXAMPLES[exampleIdx]}"`}
            data-smart-input="true"
            className="w-full pl-9 pr-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-white
              placeholder-dark-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500
              focus:border-primary-500 transition-all"
          />
        </div>
        <button onClick={parseWithAI} disabled={!input.trim() || parsing || saving}
          className="btn-primary shrink-0 py-2.5 px-4">
          {parsing ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {compact ? '' : t('smartAnalyze')}
        </button>
        {result && (
          <button onClick={reset} className="btn-icon shrink-0"><X size={15} /></button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-800/30 rounded-lg text-red-400 text-sm animate-fade-in">
          <AlertCircle size={14} />
          {error}
          <span className="text-xs text-red-500 ml-1">— {t('smartWriteMore')}</span>
        </div>
      )}

      {/* Intent preview */}
      {result && cfg && (
        <div className={`border rounded-xl overflow-hidden animate-fade-in ${cfg.bg}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <cfg.icon size={14} className={cfg.text} />
              <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
              {result.usedAI && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 border border-purple-700/40 rounded-full">AI</span>
              )}
              <span className="text-[10px] text-dark-500">{fields.confidence || 0}% {t('smartConfidence')}</span>
            </div>
            <div className="flex items-center gap-2">
              <SelectField label="" value={intent} onChange={v => set('intent', v)}
                options={Object.entries(INTENT_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
            </div>
          </div>

          {/* Intent-specific fields */}
          <div className="p-4 space-y-3">
            {/* SERVIS */}
            {intent === 'servis' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label={t('category')} value={fields.car_brand} onChange={v => set('car_brand', v)} placeholder="Telefon, Elektronika..." />
                <Field label={t('brand') + ' / ' + t('model')} value={fields.car_model} onChange={v => set('car_model', v)} placeholder="Samsung, Apple..." />
                <Field label={t('smartCodeSerial')} value={fields.car_plate} onChange={v => set('car_plate', v)} placeholder="SN-12345" />
                <Field label={t('customerName')} value={fields.customer_name} onChange={v => set('customer_name', v)} />
                <Field label={t('serviceType')} value={fields.service_type} onChange={v => set('service_type', v)} />
                <Field label={`${t('price')} (${t('currency')})`} value={fields.price} onChange={v => set('price', v)} type="number" />
                <Field label={t('date')} value={fields.date} onChange={v => set('date', v)} type="date" />
                <SelectField label={t('paymentMethod')} value={fields.payment_status || 'gozleyir'} onChange={v => set('payment_status', v)}
                  options={[{value:'odenilib',label:t('statusPaid')},{value:'gozleyir',label:t('statusWaiting')},{value:'qismen',label:t('statusPartial')},{value:'borc',label:t('statusDebt')}]} />
                <Field label={t('notes')} value={fields.notes} onChange={v => set('notes', v)} />
              </div>
            )}

            {/* STOK GİRİŞ / ÇIXIŞ */}
            {(intent === 'stok_giris' || intent === 'stok_cixis') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label text-xs">{t('products')} *</label>
                  <div className="relative">
                    <input className="input-field h-8 text-xs" value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); set('product_id', ''); }}
                      onFocus={() => setShowProductDrop(true)}
                      onBlur={() => setTimeout(() => setShowProductDrop(false), 180)}
                      placeholder={t('searchProduct')} />
                    {showProductDrop && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-2xl z-50 max-h-40 overflow-y-auto">
                        {filteredProducts.slice(0, 8).map(p => (
                          <button key={p.id} onMouseDown={() => { set('product_id', p.id); setProductSearch(p.name); setShowProductDrop(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-700 text-left">
                            <span className="text-xs text-white">{p.name}</span>
                            <span className="text-xs text-dark-400">{p.stock_qty} {p.unit}</span>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && <p className="text-xs text-dark-500 px-3 py-2">{t('noResults')}</p>}
                      </div>
                    )}
                  </div>
                  {selectedProduct ? (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={11} /> {t('selected')}: <span className="font-medium">{selectedProduct.name}</span>
                      <span className="text-dark-400 ml-1">· {t('stock')}: {selectedProduct.stock_qty} {selectedProduct.unit}</span>
                    </p>
                  ) : productSearch ? (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> "{productSearch}" {t('noResults')}
                    </p>
                  ) : null}
                </div>
                <Field label={`${t('quantity')} (${selectedProduct?.unit || fields.unit || t('unit')})`} value={fields.qty} onChange={v => set('qty', v)} type="number" />
                <Field label={t('date')} value={fields.date} onChange={v => set('date', v)} type="date" />
                <Field label={t('notes')} value={fields.notes} onChange={v => set('notes', v)} />
              </div>
            )}

            {/* SATIŞ */}
            {intent === 'satis' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label text-xs">{t('products')} *</label>
                  <div className="relative">
                    <input className="input-field h-8 text-xs" value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); set('product_id', ''); }}
                      onFocus={() => setShowProductDrop(true)}
                      onBlur={() => setTimeout(() => setShowProductDrop(false), 180)}
                      placeholder={t('searchProduct')} />
                    {showProductDrop && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-2xl z-50 max-h-40 overflow-y-auto">
                        {filteredProducts.slice(0, 8).map(p => (
                          <button key={p.id} onMouseDown={() => { set('product_id', p.id); setProductSearch(p.name); set('sell_price', p.sell_price); setShowProductDrop(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-dark-700 text-left">
                            <span className="text-xs text-white">{p.name}</span>
                            <span className="text-xs text-emerald-400">{p.sell_price} {csym}</span>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && <p className="text-xs text-dark-500 px-3 py-2">{t('noResults')}</p>}
                      </div>
                    )}
                  </div>
                  {selectedProduct ? (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={11} /> {t('selected')}: <span className="font-medium">{selectedProduct.name}</span>
                      <span className="text-dark-400 ml-1">· {selectedProduct.sell_price} {csym}</span>
                    </p>
                  ) : productSearch ? (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> "{productSearch}" {t('noResults')}
                    </p>
                  ) : null}
                </div>
                <Field label={t('quantity')} value={fields.qty} onChange={v => set('qty', v)} type="number" />
                <Field label={`${t('sellPrice')} (${t('currency')})`} value={fields.sell_price} onChange={v => set('sell_price', v)} type="number" />
                <Field label={t('customerName')} value={fields.customer_name} onChange={v => set('customer_name', v)} />
                <Field label={t('date')} value={fields.date} onChange={v => set('date', v)} type="date" />
                {fields.qty && fields.sell_price && (
                  <div className="col-span-3 px-3 py-2 bg-emerald-900/20 border border-emerald-800/30 rounded-lg">
                    <p className="text-xs text-emerald-400 font-semibold">
                      {t('total')}: {(parseFloat(fields.qty || 0) * parseFloat(fields.sell_price || 0)).toFixed(2)} {csym}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MÜŞTƏRİ */}
            {intent === 'musteri' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${t('fullName')} *`} value={fields.customer_name} onChange={v => set('customer_name', v)} />
                <Field label={t('phone')} value={fields.customer_phone} onChange={v => set('customer_phone', v)} placeholder="055 123 45 67" />
                <Field label={t('notes')} value={fields.notes} onChange={v => set('notes', v)} />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/5">
            <button onClick={reset} className="btn-secondary text-xs py-1.5 px-3">{t('cancel')}</button>
            <button onClick={handleConfirm} disabled={saving} className="btn-primary text-xs py-1.5 px-4">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              {t('smartConfirmSave')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
