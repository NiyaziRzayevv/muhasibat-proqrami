import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, DollarSign, TrendingUp, TrendingDown, BarChart2,
  RefreshCw, ShoppingCart, Clock, AlertTriangle, Tag, Layers, Truck, History
} from 'lucide-react';
import { apiBridge } from '../api/bridge';
import { useApp } from '../App';
import { getCurrencySymbol } from '../utils/currency';

function fmt(n) {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toFixed(2);
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency } = useApp();
  const csym = getCurrencySymbol(currency);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiBridge.getProductDetail(id);
      if (res.success) setProduct(res.data);
    } catch (e) {
      console.error('ProductDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center h-full"><RefreshCw size={24} className="animate-spin text-primary-400" /></div>;
  if (!product) return (
    <div className="p-6 text-center">
      <p className="text-dark-400">Məhsul tapılmadı</p>
      <button onClick={() => navigate('/products')} className="mt-4 text-primary-400 hover:text-primary-300 text-sm">← Məhsullara qayıt</button>
    </div>
  );

  const margin = product.sell_price > 0 && product.buy_price > 0
    ? (((product.sell_price - product.buy_price) / product.sell_price) * 100).toFixed(1)
    : 0;
  const isLow = product.stock_qty <= (product.min_stock || 0) && (product.min_stock || 0) > 0;

  const tabs = [
    { key: 'overview', label: 'İcmal', icon: BarChart2 },
    { key: 'movements', label: 'Stok hərəkəti', icon: Layers },
    { key: 'prices', label: 'Qiymət tarixçəsi', icon: History },
    { key: 'sales', label: 'Son satışlar', icon: ShoppingCart },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/products')} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{product.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {product.sku && <span className="flex items-center gap-1 text-xs text-dark-400"><Tag size={10} /> {product.sku}</span>}
            {product.category_name && <span className="flex items-center gap-1 text-xs text-dark-400"><Layers size={10} /> {product.category_name}</span>}
            {product.supplier_name && <span className="flex items-center gap-1 text-xs text-dark-400"><Truck size={10} /> {product.supplier_name}</span>}
          </div>
        </div>
        <button onClick={loadData} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`bg-gradient-to-br ${isLow ? 'from-red-500/10 border-red-500/20' : 'from-blue-500/10 border-blue-500/20'} to-dark-900 border rounded-2xl p-4`}>
          <div className="flex items-center gap-2 mb-2"><Package size={13} className={isLow ? 'text-red-400' : 'text-blue-400'} /><span className="text-[9px] font-bold uppercase text-dark-400">Stok</span></div>
          <p className={`text-xl font-black ${isLow ? 'text-red-300' : 'text-white'}`}>{product.stock_qty} <span className="text-xs text-dark-500">{product.unit || 'ədəd'}</span></p>
          {isLow && <p className="text-[9px] text-red-400 mt-0.5 flex items-center gap-1"><AlertTriangle size={9} /> Min: {product.min_stock}</p>}
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-dark-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={13} className="text-emerald-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Satış qiyməti</span></div>
          <p className="text-xl font-black text-white">{csym}{fmt(product.sell_price)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-dark-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={13} className="text-amber-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Alış qiyməti</span></div>
          <p className="text-xl font-black text-white">{csym}{fmt(product.buy_price)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-dark-900 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={13} className="text-purple-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Marja</span></div>
          <p className="text-xl font-black text-purple-300">{margin}%</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/10 to-dark-900 border border-cyan-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart size={13} className="text-cyan-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Satış</span></div>
          <p className="text-xl font-black text-white">{product.stats?.total_sold_qty || 0}</p>
          <p className="text-[9px] text-dark-500">{csym}{fmt(product.stats?.total_revenue)} gəlir</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-dark-800/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-primary-600/20 text-primary-400' : 'text-dark-400 hover:text-white hover:bg-dark-700/50'}`}>
              <Icon size={12} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Məhsul məlumatları</h3>
              <div className="space-y-2 text-xs">
                {[
                  ['Ad', product.name],
                  ['SKU', product.sku || '—'],
                  ['Kateqoriya', product.category_name || '—'],
                  ['Təchizatçı', product.supplier_name || '—'],
                  ['Vahid', product.unit || 'ədəd'],
                  ['Alış qiyməti', `${csym}${fmt(product.buy_price)}`],
                  ['Satış qiyməti', `${csym}${fmt(product.sell_price)}`],
                  ['Stok', `${product.stock_qty} ${product.unit || 'ədəd'}`],
                  ['Min stok', product.min_stock || 0],
                  ['Stok dəyəri (alış)', `${csym}${fmt(product.stock_qty * (product.buy_price || 0))}`],
                  ['Stok dəyəri (satış)', `${csym}${fmt(product.stock_qty * (product.sell_price || 0))}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between p-2 bg-dark-700/20 rounded-lg">
                    <span className="text-dark-400">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Satış statistikası</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Cəm satış sayı</span><span className="text-white font-medium">{product.stats?.total_sold_count || 0}</span></div>
                <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Cəm satılmış miqdar</span><span className="text-white font-medium">{product.stats?.total_sold_qty || 0}</span></div>
                <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Cəm gəlir</span><span className="text-white font-medium">{csym}{fmt(product.stats?.total_revenue)}</span></div>
              </div>
              {product.notes && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-dark-300 mb-2">Qeydlər</h4>
                  <p className="text-[11px] text-dark-400 p-2 bg-dark-700/20 rounded-lg">{product.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Layers size={14} className="text-blue-400" /> Stok hərəkətləri ({(product.stock_movements || []).length})</h3>
            {(product.stock_movements || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Stok hərəkəti yoxdur</p>
            ) : (
              <div className="space-y-1.5">
                {product.stock_movements.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-dark-700/20 rounded-xl text-xs">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.qty > 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      {m.qty > 0 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{m.movement_type} <span className={m.qty > 0 ? 'text-emerald-400' : 'text-red-400'}>{m.qty > 0 ? '+' : ''}{m.qty}</span></p>
                      <p className="text-[10px] text-dark-400">{m.note || '—'} {m.created_by_name ? `· ${m.created_by_name}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-dark-400">{m.qty_before} → {m.qty_after}</p>
                      <p className="text-[9px] text-dark-500">{m.created_at?.slice(0, 16)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prices' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><History size={14} className="text-amber-400" /> Qiymət tarixçəsi ({(product.price_history || []).length})</h3>
            {(product.price_history || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Qiymət dəyişikliyi yoxdur</p>
            ) : (
              <div className="space-y-1.5">
                {product.price_history.map(ph => (
                  <div key={ph.id} className="p-3 bg-dark-700/20 rounded-xl text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold">{ph.reason || 'Qiymət dəyişikliyi'}</span>
                      <span className="text-[9px] text-dark-500">{ph.created_at?.slice(0, 16)}</span>
                    </div>
                    <div className="flex gap-4 text-[10px]">
                      <span className="text-dark-400">Alış: <span className="text-red-300">{csym}{fmt(ph.old_cost_price)}</span> → <span className="text-emerald-300">{csym}{fmt(ph.new_cost_price)}</span></span>
                      <span className="text-dark-400">Satış: <span className="text-red-300">{csym}{fmt(ph.old_sale_price)}</span> → <span className="text-emerald-300">{csym}{fmt(ph.new_sale_price)}</span></span>
                    </div>
                    {ph.changed_by_name && <p className="text-[9px] text-dark-500 mt-1">— {ph.changed_by_name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShoppingCart size={14} className="text-emerald-400" /> Son satışlar ({(product.recent_sales || []).length})</h3>
            {(product.recent_sales || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Satış tapılmadı</p>
            ) : (
              <div className="space-y-1.5">
                {product.recent_sales.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-dark-700/20 rounded-xl text-xs cursor-pointer hover:bg-dark-700/40"
                    onClick={() => navigate(`/sales/${s.sale_id}`)}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><ShoppingCart size={12} className="text-emerald-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{s.sale_number || `#${s.sale_id}`}</p>
                      <p className="text-[10px] text-dark-400">{s.customer_name || 'Qonaq'} · {s.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{s.qty} x {csym}{fmt(s.unit_price)}</p>
                      <p className="text-emerald-400 font-bold">{csym}{fmt(s.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
