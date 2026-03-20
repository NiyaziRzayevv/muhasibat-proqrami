import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, DollarSign, CreditCard, User, Calendar,
  RefreshCw, Package, CheckCircle, Clock, AlertTriangle, FileText, Printer
} from 'lucide-react';
import { apiBridge } from '../api/bridge';
import { useApp } from '../App';
import { getCurrencySymbol } from '../utils/currency';

function fmt(n) {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toFixed(2);
}

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency, showNotification } = useApp();
  const csym = getCurrencySymbol(currency);

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiBridge.getSaleDetail(id);
      if (res.success) setSale(res.data);
    } catch (e) {
      console.error('SaleDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handlePrintReceipt() {
    try {
      const res = await apiBridge.generateSaleReceipt(id);
      if (res.success) showNotification('Çek yaradıldı', 'success');
      else showNotification(res.error || 'Xəta', 'error');
    } catch (e) { showNotification(e.message, 'error'); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><RefreshCw size={24} className="animate-spin text-primary-400" /></div>;
  if (!sale) return (
    <div className="p-6 text-center">
      <p className="text-dark-400">Satış tapılmadı</p>
      <button onClick={() => navigate('/sales')} className="mt-4 text-primary-400 hover:text-primary-300 text-sm">← Satışlara qayıt</button>
    </div>
  );

  const statusColor = {
    odenilib: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    qismen: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    borc: 'bg-red-500/15 text-red-400 border-red-500/20',
    gozleyir: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales')} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{sale.sale_number || `Satış #${sale.id}`}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-dark-400"><Calendar size={10} /> {sale.date}</span>
            {sale.customer_name && <span className="flex items-center gap-1 text-xs text-dark-400"><User size={10} /> {sale.customer_name}</span>}
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor[sale.payment_status] || 'bg-dark-600/50 text-dark-400 border-dark-600/30'}`}>{sale.payment_status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrintReceipt} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors" title="Çek çap et">
            <Printer size={14} />
          </button>
          <button onClick={loadData} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-dark-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign size={13} className="text-emerald-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Cəm</span></div>
          <p className="text-xl font-black text-white">{csym}{fmt(sale.total)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-dark-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle size={13} className="text-blue-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Ödənilən</span></div>
          <p className="text-xl font-black text-blue-300">{csym}{fmt(sale.paid_amount)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-dark-900 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><CreditCard size={13} className="text-red-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Qalıq</span></div>
          <p className="text-xl font-black text-red-300">{csym}{fmt((sale.total || 0) - (sale.paid_amount || 0))}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-dark-900 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Package size={13} className="text-purple-400" /><span className="text-[9px] font-bold uppercase text-dark-400">Məhsul</span></div>
          <p className="text-xl font-black text-white">{(sale.items || []).length} <span className="text-xs text-dark-500">növ</span></p>
        </div>
      </div>

      {/* Sale Items */}
      <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Package size={14} className="text-primary-400" /> Məhsullar</h3>
        {(sale.items || []).length === 0 ? (
          <p className="text-dark-500 text-xs text-center py-6">Məhsul tapılmadı</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-dark-500 uppercase px-3 pb-1 border-b border-dark-700/30">
              <span className="col-span-5">Məhsul</span>
              <span className="col-span-2 text-right">Qiymət</span>
              <span className="col-span-2 text-center">Miqdar</span>
              <span className="col-span-3 text-right">Cəm</span>
            </div>
            {sale.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-dark-700/20 rounded-xl text-xs hover:bg-dark-700/40 transition-colors cursor-pointer"
                onClick={() => item.product_id && navigate(`/products/${item.product_id}`)}>
                <div className="col-span-5 min-w-0">
                  <p className="font-semibold text-white truncate">{item.product_name || item.name || 'Məhsul'}</p>
                  {item.sku && <p className="text-[9px] text-dark-500">{item.sku}</p>}
                </div>
                <p className="col-span-2 text-right text-dark-300">{csym}{fmt(item.unit_price)}</p>
                <p className="col-span-2 text-center text-white font-medium">{item.qty}</p>
                <p className="col-span-3 text-right font-bold text-white">{csym}{fmt(item.total)}</p>
              </div>
            ))}
            {/* Totals */}
            <div className="border-t border-dark-700/30 pt-3 mt-3 space-y-1.5 px-3">
              {sale.discount > 0 && (
                <div className="flex justify-between text-xs"><span className="text-dark-400">Endirim</span><span className="text-amber-400">-{csym}{fmt(sale.discount)}</span></div>
              )}
              <div className="flex justify-between text-sm font-bold"><span className="text-dark-300">Ümumi cəm</span><span className="text-white">{csym}{fmt(sale.total)}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sale Info */}
        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Satış məlumatları</h3>
          <div className="space-y-2 text-xs">
            {[
              ['Satış №', sale.sale_number || `#${sale.id}`],
              ['Tarix', sale.date],
              ['Müştəri', sale.customer_name || 'Qonaq'],
              ['Ödəniş üsulu', sale.payment_method || '—'],
              ['Ödəniş statusu', sale.payment_status],
              ['Qeyd', sale.notes || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between p-2 bg-dark-700/20 rounded-lg">
                <span className="text-dark-400">{label}</span>
                <span className="text-white font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Debt Info */}
        {sale.debt && (
          <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-red-400" /> Borc məlumatı</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Borc məbləği</span><span className="text-red-300 font-bold">{csym}{fmt(sale.debt.total_amount)}</span></div>
              <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Ödənilən</span><span className="text-emerald-300 font-bold">{csym}{fmt(sale.debt.paid_amount)}</span></div>
              <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Qalıq</span><span className="text-red-300 font-bold">{csym}{fmt(sale.debt.remaining_amount)}</span></div>
              <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Status</span><span className={`font-bold ${sale.debt.status === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>{sale.debt.status}</span></div>
              {sale.debt.due_date && <div className="flex justify-between p-2 bg-dark-700/20 rounded-lg"><span className="text-dark-400">Son tarix</span><span className="text-white">{sale.debt.due_date}</span></div>}
            </div>
          </div>
        )}

        {/* Finance Transactions */}
        {(sale.finance_transactions || []).length > 0 && (
          <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><FileText size={14} className="text-blue-400" /> Maliyyə əməliyyatları</h3>
            <div className="space-y-1.5">
              {sale.finance_transactions.map(ft => (
                <div key={ft.id} className="flex items-center gap-2 p-2.5 bg-dark-700/20 rounded-lg text-xs">
                  <DollarSign size={12} className={ft.type === 'income' ? 'text-emerald-400' : 'text-red-400'} />
                  <span className="text-white font-semibold">{csym}{fmt(ft.amount)}</span>
                  <span className="text-dark-400">{ft.category}</span>
                  <span className="ml-auto text-[9px] text-dark-500">{ft.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock Movements */}
        {(sale.stock_movements || []).length > 0 && (
          <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Package size={14} className="text-violet-400" /> Stok hərəkətləri</h3>
            <div className="space-y-1.5">
              {sale.stock_movements.map(sm => (
                <div key={sm.id} className="flex items-center gap-2 p-2.5 bg-dark-700/20 rounded-lg text-xs">
                  <Package size={12} className="text-red-400" />
                  <span className="text-white font-semibold">{sm.product_name || `Məhsul #${sm.product_id}`}</span>
                  <span className="text-red-400">{sm.qty}</span>
                  <span className="text-dark-400">{sm.qty_before} → {sm.qty_after}</span>
                  <span className="ml-auto text-[9px] text-dark-500">{sm.created_at?.slice(0, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
