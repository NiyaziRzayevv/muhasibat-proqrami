import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Search, Plus, Trash2, Save, Loader2,
  ShoppingCart, Package, AlertTriangle
} from 'lucide-react';
import { useApp } from '../App';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return `${Number(n).toFixed(2)} ₼`;
}

export default function NewSale() {
  const navigate = useNavigate();
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('odenilib');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [pRes, cRes] = await Promise.all([window.api.getProducts({ userId }), window.api.getCustomers('', userId)]);
      if (pRes.success) setProducts(pRes.data);
      if (cRes.success) setCustomers(cRes.data);
    })();
  }, [userId]);

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product) {
    setCartItems(items => {
      const existing = items.find(i => i.product_id === product.id);
      if (existing) {
        return items.map(i => i.product_id === product.id
          ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.unit_price }
          : i
        );
      }
      return [...items, {
        product_id: product.id,
        product_name: product.name,
        qty: 1,
        unit_price: product.sell_price || 0,
        total: product.sell_price || 0,
        stock_qty: product.stock_qty,
        unit: product.unit,
      }];
    });
    setSearch('');
    setShowDropdown(false);
  }

  function updateItem(productId, field, value) {
    setCartItems(items => items.map(i => {
      if (i.product_id !== productId) return i;
      const updated = { ...i, [field]: value };
      if (field === 'qty' || field === 'unit_price') {
        updated.total = (parseFloat(field === 'qty' ? value : updated.qty) || 0) *
                        (parseFloat(field === 'unit_price' ? value : updated.unit_price) || 0);
      }
      return updated;
    }));
  }

  function removeItem(productId) {
    setCartItems(items => items.filter(i => i.product_id !== productId));
  }

  const subtotal = cartItems.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);
  const computedPaid = paymentStatus === 'odenilib' ? total : (parseFloat(paidAmount) || 0);

  async function handleSave() {
    if (cartItems.length === 0) { showNotification('Ən azı bir məhsul seçin', 'error'); return; }
    const insufficientItem = cartItems.find(i => i.qty > i.stock_qty);
    if (insufficientItem) {
      showNotification(`"${insufficientItem.product_name}" üçün stok kifayət etmir (mövcud: ${insufficientItem.stock_qty})`, 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await window.api.createSale({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
        customer_id: customerId || null,
        customer_name: customerName || null,
        discount: discountVal,
        payment_status: paymentStatus,
        paid_amount: computedPaid,
        notes: notes || null,
        created_by: currentUser?.id || null,
        items: cartItems.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          qty: parseFloat(i.qty),
          unit_price: parseFloat(i.unit_price),
        })),
      });
      if (result.success) {
        showNotification('Satış qeyd edildi!', 'success');
        navigate('/sales');
      } else {
        showNotification(result.error || 'Xəta baş verdi', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sales')} className="btn-icon">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Yeni Satış</h1>
            <p className="text-sm text-dark-400 mt-0.5">Məhsul seçin və satışı tamamlayın</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || cartItems.length === 0} className="btn-primary">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Satışı Tamamla
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-5 gap-4 h-full">
          {/* Left: Product Search */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="card p-4">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Məhsul Axtar</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 z-10" />
                <input
                  ref={searchRef}
                  className="input-field pl-9"
                  placeholder="Məhsul adı və ya SKU..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  autoFocus
                />
                {showDropdown && search && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="text-dark-500 text-sm text-center py-4">Məhsul tapılmadı</p>
                    ) : filteredProducts.slice(0, 12).map(p => (
                      <button key={p.id} onMouseDown={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-dark-700 transition-colors text-left">
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          <p className="text-xs text-dark-400">{p.category_name || ''} {p.sku ? `· ${p.sku}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-400">{fmt(p.sell_price)}</p>
                          <p className={`text-xs ${p.stock_qty <= p.min_stock ? 'text-amber-400' : 'text-dark-500'}`}>
                            Stok: {p.stock_qty} {p.unit}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="card flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-dark-700 flex items-center gap-2">
                <ShoppingCart size={14} className="text-dark-400" />
                <span className="text-sm font-semibold text-white">Seçilmiş məhsullar</span>
                <span className="text-xs text-dark-500 ml-1">({cartItems.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <div className="empty-state py-12">
                    <Package size={32} className="text-dark-600 mb-2" />
                    <p className="text-dark-500 text-sm">Məhsul seçilməyib</p>
                    <p className="text-dark-600 text-xs mt-1">Yuxarıdakı axtarışdan məhsul əlavə edin</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Məhsul</th><th>Miqdar</th><th>Qiymət</th><th>Cəm</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map(item => (
                        <tr key={item.product_id}>
                          <td>
                            <div>
                              <p className="text-sm font-medium text-white">{item.product_name}</p>
                              {item.qty > item.stock_qty && (
                                <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle size={10} /> Stok kifayət etmir ({item.stock_qty})
                                </p>
                              )}
                            </div>
                          </td>
                          <td>
                            <input
                              type="number" min="0.01" step="0.01"
                              className="input-field w-20 h-8 text-xs text-center"
                              value={item.qty}
                              onChange={e => updateItem(item.product_id, 'qty', parseFloat(e.target.value) || 1)}
                            />
                          </td>
                          <td>
                            <input
                              type="number" min="0" step="0.01"
                              className="input-field w-24 h-8 text-xs text-center"
                              value={item.unit_price}
                              onChange={e => updateItem(item.product_id, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="font-semibold text-emerald-400">{fmt(item.total)}</td>
                          <td>
                            <button onClick={() => removeItem(item.product_id)}
                              className="btn-icon w-7 h-7 hover:bg-red-900/30 hover:text-red-400">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right: Summary & Customer */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Müştəri</p>
              <div>
                <label className="label">Müştəri seç</label>
                <select className="select-field" value={customerId}
                  onChange={e => {
                    setCustomerId(e.target.value);
                    const c = customers.find(c => c.id === parseInt(e.target.value));
                    if (c) setCustomerName(c.name);
                  }}>
                  <option value="">— Seçin —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Və ya ad yaz</label>
                <input className="input-field" placeholder="Müştəri adı..." value={customerName}
                  onChange={e => { setCustomerName(e.target.value); setCustomerId(''); }} />
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Ödəniş</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">Ara cəm:</span>
                  <span className="text-white font-medium">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-dark-400 text-sm shrink-0">Endirim (₼):</span>
                  <input type="number" min="0" step="0.01" className="input-field w-24 h-8 text-xs text-right"
                    value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>
                <div className="flex items-center justify-between text-sm border-t border-dark-700 pt-2">
                  <span className="text-white font-semibold">Yekun:</span>
                  <span className="text-emerald-400 font-bold text-lg">{fmt(total)}</span>
                </div>
              </div>

              <div>
                <label className="label">Ödəniş statusu</label>
                <select className="select-field" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                  <option value="odenilib">Tamamilə ödənilib</option>
                  <option value="gozleyir">Gözləyir</option>
                  <option value="qismen">Qismən ödənilib</option>
                  <option value="borc">Borc</option>
                </select>
              </div>

              {paymentStatus === 'qismen' && (
                <div>
                  <label className="label">Ödənilən məbləğ (₼)</label>
                  <input type="number" min="0" step="0.01" className="input-field"
                    value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                </div>
              )}

              <div>
                <label className="label">Qeyd</label>
                <textarea className="input-field resize-none h-16" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <button onClick={handleSave} disabled={saving || cartItems.length === 0} className="btn-primary w-full justify-center py-3 text-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                Satışı Tamamla — {fmt(total)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
