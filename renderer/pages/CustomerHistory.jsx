import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, Wrench, ShoppingCart, CreditCard, MessageCircle, RefreshCw, ChevronRight, Phone, FileSpreadsheet, TrendingUp, Calendar, Star } from 'lucide-react';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrencySymbol } from '../utils/currency';

function getStatusMap(t) {
  return {
    odenilib: { label: t('statusPaid'), cls: 'status-odenilib' },
    gozleyir: { label: t('statusWaiting'), cls: 'status-gozleyir' },
    qismen:   { label: t('statusPartial'),   cls: 'status-qismen' },
    borc:     { label: t('statusDebt'),     cls: 'status-borc' },
  };
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)}`;
}

export default function CustomerHistory() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const STATUS_MAP = getStatusMap(t);
  const userId = isAdmin ? null : currentUser?.id;
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiBridge.getCustomers('', userId).then(r => { if (r.success) setCustomers(r.data); });
  }, [userId]);

  const filteredCustomers = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const loadHistory = useCallback(async (customer) => {
    setSelected(customer);
    setRecords([]);
    setSales([]);
    setLoading(true);
    try {
      const [rByIdRes, sRes] = await Promise.all([
        apiBridge.getRecords({ customer_id: customer.id, userId }),
        apiBridge.getSales({ customer_id: customer.id, userId }),
      ]);
      // Also fetch name-based records for entries without customer_id
      const rByNameRes = customer.name
        ? await apiBridge.getRecords({ search: customer.name, userId })
        : { success: false };

      const idSet = new Set();
      const allRecords = [];
      if (rByIdRes.success) {
        for (const r of rByIdRes.data) { idSet.add(r.id); allRecords.push(r); }
      }
      if (rByNameRes.success) {
        for (const r of rByNameRes.data) {
          if (!idSet.has(r.id)) allRecords.push(r);
        }
      }
      allRecords.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      setRecords(allRecords);
      if (sRes.success) setSales(sRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId]);

  const totalDebt = [
    ...records.filter(r => r.payment_status !== 'odenilib').map(r => (r.total_price || 0) - (r.paid_amount || 0)),
    ...sales.filter(s => s.payment_status !== 'odenilib').map(s => (s.total || 0) - (s.paid_amount || 0)),
  ].reduce((a, b) => a + b, 0);

  const totalSpent = [
    ...records.map(r => r.paid_amount || 0),
    ...sales.map(s => s.paid_amount || 0),
  ].reduce((a, b) => a + b, 0);

  const [historyTab, setHistoryTab] = useState('all');

  function openWhatsApp(customer, debtAmt) {
    const phone = (customer.phone || '').replace(/\D/g, '');
    if (!phone) { showNotification('Telefon nömrəsi yoxdur', 'error'); return; }
    const intl = phone.startsWith('994') ? phone : phone.startsWith('0') ? '994' + phone.slice(1) : '994' + phone;
    const msg = encodeURIComponent(
      `Hörmətli ${customer.name},\n\nSizin ${fmt(debtAmt)} məbləğində ödənilməmiş borcunuz var.\nZəhmət olmasa ödəniş etməyinizi xahiş edirik.\n\nHörmətlə, SmartQeyd`
    );
    const url = `https://wa.me/${intl}?text=${msg}`;
    window.api.openExternal(url).catch(() => window.open(url, '_blank'));
  }

  async function handleExport() {
    if (!selected) return;
    try {
      const rows = [
        ...records.map(r => ({ Tip: 'Servis', Tarix: r.date, Melumat: r.service_type || '-', Meblec: r.total_price || 0, Odenilib: r.paid_amount || 0, Status: STATUS_MAP[r.payment_status]?.label || '-' })),
        ...sales.map(s => ({ Tip: 'Satis', Tarix: s.date, Melumat: `${s.item_count || 0} mehsul`, Meblec: s.total || 0, Odenilib: s.paid_amount || 0, Status: STATUS_MAP[s.payment_status]?.label || '-' })),
      ].sort((a, b) => (b.Tarix || '').localeCompare(a.Tarix || ''));
      const result = await window.api.exportExcel(rows, `${selected.name}-tarixce-${new Date().toISOString().split('T')[0]}.xlsx`);
      if (result.success) { showNotification('Excel haz\u0131r oldu', 'success'); window.api.showItemInFolder(result.path); }
    } catch (e) { showNotification('X\u0259ta: ' + e.message, 'error'); }
  }

  // Build combined timeline
  const timeline = [
    ...records.map(r => ({ ...r, _type: 'record', _date: r.date })),
    ...sales.map(s => ({ ...s, _type: 'sale', _date: s.date })),
  ].sort((a, b) => (b._date || '').localeCompare(a._date || ''));

  const filteredTimeline = historyTab === 'records' ? timeline.filter(i => i._type === 'record')
    : historyTab === 'sales' ? timeline.filter(i => i._type === 'sale') : timeline;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={20} className="text-primary-400" /> Müştəri Tarixçəsi</h1>
          <p className="text-sm text-dark-400 mt-0.5">{customers.length} müştəri · bütün servis + satış qeydləri</p>
        </div>
        {selected && (
          <button onClick={handleExport} className="btn-secondary text-xs py-1.5">
            <FileSpreadsheet size={13} /> Excel Export
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Customer list */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input className="input-field pl-9 h-9 text-xs" placeholder="Ad və ya telefon axtar..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="empty-state py-12">
                <Users size={28} className="text-dark-600 mb-2" />
                <p className="text-dark-500 text-xs">Müştəri tapılmadı</p>
              </div>
            ) : filteredCustomers.map(c => (
              <button key={c.id} onClick={() => loadHistory(c)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  selected?.id === c.id ? 'bg-primary-900/40 border border-primary-700/40' : 'hover:bg-dark-700/50'
                }`}>
                <div className="w-9 h-9 rounded-full bg-primary-900/40 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-400">{(c.name || '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-dark-400 flex items-center gap-1"><Phone size={9} />{c.phone}</p>}
                </div>
                <ChevronRight size={13} className="text-dark-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* History panel */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="empty-state h-full">
              <Users size={40} className="text-dark-700 mb-3" />
              <p className="text-dark-400 text-sm">Sol tərəfdən müştəri seçin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customer summary card */}
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-900/40 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-400">{(selected.name || '?')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                      {selected.phone && (
                        <p className="text-sm text-dark-400 flex items-center gap-1 mt-1"><Phone size={12} />{selected.phone}</p>
                      )}
                      {selected.notes && <p className="text-xs text-dark-500 mt-1">{selected.notes}</p>}
                    </div>
                  </div>
                  {totalDebt > 0 && (
                    <button onClick={() => openWhatsApp(selected, totalDebt)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-700/20 hover:bg-green-700/30 text-green-400 border border-green-700/30 rounded-xl text-xs font-medium transition-all">
                      <MessageCircle size={14} /> WhatsApp Borc Xatırlatma
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-3 mt-5">
                  <div className="bg-dark-700 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{records.length + sales.length}</p>
                    <p className="text-xs text-dark-400 mt-0.5">Ümumi əməliyyat</p>
                  </div>
                  <div className="bg-dark-700 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{fmt(totalSpent)}</p>
                    <p className="text-xs text-dark-400 mt-0.5">Ümumi ödəniş</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${totalDebt > 0 ? 'bg-red-900/20 border border-red-800/30' : 'bg-dark-700'}`}>
                    <p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-dark-400'}`}>{fmt(totalDebt)}</p>
                    <p className="text-xs text-dark-400 mt-0.5">Qalan borc</p>
                  </div>
                  <div className="bg-dark-700 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-primary-400">{records.length}</p>
                    <p className="text-xs text-dark-400 mt-0.5">Servis qeydi</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="empty-state py-16"><RefreshCw size={24} className="animate-spin text-dark-600" /></div>
              ) : (
                <>
                  {/* Tab selector */}
                  <div className="flex items-center gap-1 bg-dark-800 rounded-xl p-1 w-fit">
                    {[['all', `Hamısı (${timeline.length})`], ['records', `Servis (${records.length})`], ['sales', `Satış (${sales.length})`]].map(([key, label]) => (
                      <button key={key} onClick={() => setHistoryTab(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${historyTab === key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Unified Timeline */}
                  {filteredTimeline.length === 0 ? (
                    <div className="empty-state py-16">
                      <CreditCard size={32} className="text-dark-700 mb-2" />
                      <p className="text-dark-500 text-sm">Bu müştəri üçün əməliyyat tapılmadı</p>
                    </div>
                  ) : (
                    <div className="card overflow-hidden">
                      <table className="data-table">
                        <thead>
                          <tr><th>Tarix</th><th>Növ</th><th>Məlumat</th><th>Məbləğ</th><th>Ödənilib</th><th>Borc</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {filteredTimeline.map((item, i) => {
                            const isRecord = item._type === 'record';
                            const total = isRecord ? (item.total_price || 0) : (item.total || 0);
                            const paid = isRecord ? (item.paid_amount || 0) : (item.paid_amount || 0);
                            const debt = total - paid;
                            return (
                              <tr key={`${item._type}-${item.id}`}>
                                <td className="font-mono text-xs text-dark-400">{item._date}</td>
                                <td>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isRecord ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                                  }`}>
                                    {isRecord ? <Wrench size={9} /> : <ShoppingCart size={9} />}
                                    {isRecord ? 'Servis' : 'Satış'}
                                  </span>
                                </td>
                                <td className="text-dark-200 max-w-[200px] truncate">
                                  {isRecord
                                    ? (item.service_type || [item.car_brand, item.car_model].filter(Boolean).join(' ') || '—')
                                    : `${item.item_count || 0} məhsul`
                                  }
                                </td>
                                <td className="font-bold text-white">{fmt(total)}</td>
                                <td className="text-emerald-400">{fmt(paid)}</td>
                                <td className={debt > 0 ? 'text-red-400 font-semibold' : 'text-dark-600'}>{debt > 0 ? fmt(debt) : '—'}</td>
                                <td><span className={STATUS_MAP[item.payment_status]?.cls || 'status-badge'}>{STATUS_MAP[item.payment_status]?.label || '—'}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
