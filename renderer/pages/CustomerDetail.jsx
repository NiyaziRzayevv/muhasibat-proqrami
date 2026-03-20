import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, MapPin, ShoppingCart, CreditCard, Calendar,
  CheckCircle, Clock, FileText, Car, DollarSign, TrendingUp, Activity,
  Edit2, Trash2, Plus, RefreshCw, AlertTriangle, MessageSquare
} from 'lucide-react';
import { apiBridge } from '../api/bridge';
import { useApp } from '../App';
import { getCurrencySymbol } from '../utils/currency';

function fmt(n) {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toFixed(2);
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, currency, showNotification } = useApp();
  const csym = getCurrencySymbol(currency);

  const [customer, setCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, timelineRes] = await Promise.all([
        apiBridge.getCustomerDetail(id),
        apiBridge.getCustomerTimeline(id, 50),
      ]);
      if (detailRes.success) setCustomer(detailRes.data);
      if (timelineRes.success) setTimeline(timelineRes.data || []);
    } catch (e) {
      console.error('CustomerDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={24} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center">
        <p className="text-dark-400">Müştəri tapılmadı</p>
        <button onClick={() => navigate('/customers')} className="mt-4 text-primary-400 hover:text-primary-300 text-sm">← Müştərilərə qayıt</button>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'İcmal', icon: Activity },
    { key: 'sales', label: 'Satışlar', icon: ShoppingCart },
    { key: 'debts', label: 'Borclar', icon: CreditCard },
    { key: 'vehicles', label: 'Vasitələr', icon: Car },
    { key: 'timeline', label: 'Tarixçə', icon: Clock },
    { key: 'notes', label: 'Qeydlər', icon: MessageSquare },
  ];

  const typeIcon = {
    sale: <ShoppingCart size={12} className="text-emerald-400" />,
    payment: <DollarSign size={12} className="text-blue-400" />,
    debt: <CreditCard size={12} className="text-red-400" />,
    appointment: <Calendar size={12} className="text-cyan-400" />,
    task: <CheckCircle size={12} className="text-purple-400" />,
    note: <FileText size={12} className="text-amber-400" />,
    record: <FileText size={12} className="text-dark-400" />,
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{customer.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {customer.phone && <span className="flex items-center gap-1 text-xs text-dark-400"><Phone size={10} /> {customer.phone}</span>}
            {customer.email && <span className="flex items-center gap-1 text-xs text-dark-400"><Mail size={10} /> {customer.email}</span>}
            {customer.address && <span className="flex items-center gap-1 text-xs text-dark-400"><MapPin size={10} /> {customer.address}</span>}
          </div>
        </div>
        <button onClick={loadData} className="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-dark-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><ShoppingCart size={13} className="text-emerald-400" /><span className="text-[9px] font-bold text-emerald-400/70 uppercase">Satışlar</span></div>
          <p className="text-xl font-black text-white">{customer.sale_count || 0}</p>
          <p className="text-[9px] text-dark-500 mt-0.5">{csym}{fmt(customer.total_spent)} cəm</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-dark-900 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><CreditCard size={13} className="text-red-400" /><span className="text-[9px] font-bold text-red-400/70 uppercase">Borc</span></div>
          <p className="text-xl font-black text-red-300">{csym}{fmt(customer.total_debt)}</p>
          <p className="text-[9px] text-dark-500 mt-0.5">{(customer.debts || []).length} açıq borc</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-dark-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Car size={13} className="text-blue-400" /><span className="text-[9px] font-bold text-blue-400/70 uppercase">Vasitə</span></div>
          <p className="text-xl font-black text-white">{(customer.vehicles || []).length}</p>
          <p className="text-[9px] text-dark-500 mt-0.5">qeydiyyatlı</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-dark-900 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><Calendar size={13} className="text-purple-400" /><span className="text-[9px] font-bold text-purple-400/70 uppercase">Son satış</span></div>
          <p className="text-sm font-bold text-white">{customer.last_sale_date || '—'}</p>
          <p className="text-[9px] text-dark-500 mt-0.5">{customer.last_sale_date ? '' : 'Satış yoxdur'}</p>
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
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity size={14} className="text-primary-400" /> Son əməliyyatlar</h3>
            {timeline.length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Heç bir əməliyyat tapılmadı</p>
            ) : (
              <div className="space-y-2">
                {timeline.slice(0, 15).map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-dark-700/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-dark-700/50 flex items-center justify-center shrink-0 mt-0.5">
                      {typeIcon[ev.type] || <FileText size={12} className="text-dark-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{ev.title}</p>
                      <p className="text-[10px] text-dark-400 truncate">{ev.description}</p>
                    </div>
                    <span className="text-[9px] text-dark-500 shrink-0">{ev.date?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShoppingCart size={14} className="text-emerald-400" /> Satışlar ({(customer.sales || []).length})</h3>
            {(customer.sales || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Satış tapılmadı</p>
            ) : (
              <div className="space-y-2">
                {customer.sales.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-dark-700/20 hover:bg-dark-700/40 rounded-xl transition-colors cursor-pointer"
                    onClick={() => navigate(`/sales/${s.id}`)}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.payment_status === 'odenilib' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                      {s.payment_status === 'odenilib' ? <CheckCircle size={14} className="text-emerald-400" /> : <Clock size={14} className="text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{s.sale_number || `#${s.id}`}</p>
                      <p className="text-[10px] text-dark-400">{s.date} · {s.item_count || 0} məhsul</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{csym}{fmt(s.total)}</p>
                      <p className={`text-[9px] font-bold ${s.payment_status === 'odenilib' ? 'text-emerald-400' : 'text-amber-400'}`}>{s.payment_status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'debts' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><CreditCard size={14} className="text-red-400" /> Açıq borclar ({(customer.debts || []).length})</h3>
            {(customer.debts || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Açıq borc yoxdur</p>
            ) : (
              <div className="space-y-2">
                {customer.debts.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{d.sale_number || `Borc #${d.id}`}</p>
                      <p className="text-[10px] text-dark-400">{d.due_date ? `Son tarix: ${d.due_date}` : 'Son tarix təyin edilməyib'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-300">{csym}{fmt(d.remaining_amount)}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${d.status === 'overdue' ? 'bg-red-500/20 text-red-400' : d.status === 'partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-dark-600/50 text-dark-400'}`}>{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Payments */}
            {(customer.payments || []).length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-dark-300 mb-2">Son ödənişlər</h4>
                <div className="space-y-1.5">
                  {customer.payments.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 bg-dark-700/20 rounded-lg text-xs">
                      <DollarSign size={12} className="text-emerald-400" />
                      <span className="text-white font-semibold">{csym}{fmt(p.amount)}</span>
                      <span className="text-dark-500">{p.payment_method}</span>
                      <span className="ml-auto text-dark-500 text-[9px]">{p.payment_date || p.created_at?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Car size={14} className="text-blue-400" /> Vasitələr ({(customer.vehicles || []).length})</h3>
            {(customer.vehicles || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Vasitə qeydiyyatı yoxdur</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customer.vehicles.map(v => (
                  <div key={v.id} className="p-3 bg-dark-700/20 border border-dark-600/20 rounded-xl">
                    <p className="text-xs font-bold text-white">{v.plate_number}</p>
                    <p className="text-[10px] text-dark-400 mt-1">{[v.brand, v.model, v.year].filter(Boolean).join(' · ')}</p>
                    {v.vin && <p className="text-[9px] text-dark-500 mt-0.5">VIN: {v.vin}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Clock size={14} className="text-primary-400" /> Tam tarixçə ({timeline.length})</h3>
            {timeline.length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Heç bir hadisə tapılmadı</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-dark-700/50" />
                <div className="space-y-1.5">
                  {timeline.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 pl-0 relative">
                      <div className="w-7 h-7 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center shrink-0 z-10">
                        {typeIcon[ev.type] || <FileText size={10} className="text-dark-500" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-white truncate">{ev.title}</p>
                          <span className="text-[9px] text-dark-500 shrink-0">{ev.date?.slice(0, 10)}</span>
                        </div>
                        <p className="text-[10px] text-dark-400 truncate">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><MessageSquare size={14} className="text-amber-400" /> Qeydlər ({(customer.notes_list || []).length})</h3>
            {(customer.notes_list || []).length === 0 ? (
              <p className="text-dark-500 text-xs text-center py-8">Qeyd yoxdur</p>
            ) : (
              <div className="space-y-2">
                {customer.notes_list.map(n => (
                  <div key={n.id} className="p-3 bg-dark-700/20 border border-dark-600/20 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-white">{n.title || 'Qeyd'}</p>
                      <span className="text-[9px] text-dark-500">{n.created_at?.slice(0, 10)}</span>
                    </div>
                    <p className="text-[10px] text-dark-400">{n.content}</p>
                    {n.created_by_name && <p className="text-[9px] text-dark-500 mt-1">— {n.created_by_name}</p>}
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
