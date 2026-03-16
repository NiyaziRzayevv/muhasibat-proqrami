import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Calendar, RefreshCw
} from 'lucide-react';
import { useApp } from '../App';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

function fmt(n) { return Number(n || 0).toFixed(2); }

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#6366f1'];

const now = new Date();
const PRESETS = [
  { label: 'Bu ay', start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] },
  { label: 'Bu il', start: `${now.getFullYear()}-01-01`, end: now.toISOString().split('T')[0] },
  { label: 'Keçən ay', start: (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.toISOString().split('T')[0]; })(), end: (() => { const d = new Date(now.getFullYear(), now.getMonth(), 0); return d.toISOString().split('T')[0]; })() },
];

const METHOD_CONFIG = [
  { key: 'cash',     label: 'Nağd',     color: '#10b981', bg: 'from-emerald-900/40 to-emerald-950/60 border-emerald-700/30' },
  { key: 'card',     label: 'Kart',     color: '#3b82f6', bg: 'from-blue-900/40 to-blue-950/60 border-blue-700/30' },
  { key: 'transfer', label: 'Köçürmə', color: '#8b5cf6', bg: 'from-violet-900/40 to-violet-950/60 border-violet-700/30' },
  { key: 'debt',     label: 'Borc',    color: '#ef4444', bg: 'from-red-900/40 to-red-950/60 border-red-700/30' },
  { key: 'partial',  label: 'Qismən',  color: '#f59e0b', bg: 'from-amber-900/40 to-amber-950/60 border-amber-700/30' },
];

export default function Finance() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [data, setData] = useState(null);
  const [payStats, setPayStats] = useState([]);
  const [monthlyRev, setMonthlyRev] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState(0);
  const [startDate, setStartDate] = useState(PRESETS[0].start);
  const [endDate, setEndDate] = useState(PRESETS[0].end);

  useEffect(() => {
    setStartDate(PRESETS[preset].start);
    setEndDate(PRESETS[preset].end);
  }, [preset]);

  useEffect(() => { if (startDate && endDate) loadData(); }, [startDate, endDate, userId]);

  async function loadData() {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const [res, pres, revRes] = await Promise.all([
        window.api.getFinanceSummary(startDate, endDate, userId),
        window.api.getSalesPaymentStats(startDate, endDate, userId),
        window.api.getMonthlyRevenue(year, userId),
      ]);
      if (res.success) setData(res.data);
      else showNotification(res.error || 'Xəta', 'error');
      if (pres.success) setPayStats(pres.data || []);
      if (revRes.success) setMonthlyRev(revRes.data || []);
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const AZ_MONTHS = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

  const combinedChartData = (() => {
    const expMap = {};
    (data?.monthlyExpenses || []).forEach(m => { expMap[m.month] = m.total; });
    return monthlyRev.map(r => ({
      name: AZ_MONTHS[(parseInt(r.month) - 1)] || r.month,
      'Gəlir': Number((r.total || 0).toFixed(2)),
      'Xərc': Number((expMap[r.month] || 0).toFixed(2)),
    }));
  })();

  const monthlyChartData = data?.monthlyExpenses?.slice().reverse().map(m => ({
    name: m.month,
    xərc: m.total,
  })) || [];

  const pieData = data?.expensesByCategory?.slice(0, 6).map(c => ({
    name: c.category,
    value: c.total,
  })) || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Maliyyə</h1>
              <p className="text-dark-400 text-xs">Gəlir, xərc və mənfəət analizi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-dark-800 border border-dark-700 rounded-xl p-1">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => setPreset(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${preset === i ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={loadData} className="p-2 hover:bg-dark-800 text-dark-400 hover:text-white rounded-xl transition-colors">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Custom date range */}
        <div className="flex items-center gap-3">
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPreset(-1); }}
            className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
          <span className="text-dark-500 text-sm">—</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPreset(-1); }}
            className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Ümumi Gəlir', value: data.income, icon: TrendingUp, color: 'emerald', arrow: 'up' },
                { label: 'Servis Gəliri', value: data.serviceRevenue, icon: BarChart3, color: 'blue', arrow: 'up' },
                { label: 'Satış Gəliri', value: data.salesRevenue, icon: BarChart3, color: 'purple', arrow: 'up' },
                { label: 'Ümumi Xərc', value: data.expenses, icon: TrendingDown, color: 'red', arrow: 'down' },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                const colorMap = { emerald: 'text-emerald-400 bg-emerald-500/10', blue: 'text-blue-400 bg-blue-500/10', purple: 'text-purple-400 bg-purple-500/10', red: 'text-red-400 bg-red-500/10' };
                return (
                  <div key={i} className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[kpi.color]}`}>
                        <Icon size={16} />
                      </div>
                      {kpi.arrow === 'up'
                        ? <ArrowUpRight size={14} className="text-emerald-400" />
                        : <ArrowDownRight size={14} className="text-red-400" />}
                    </div>
                    <p className="text-2xl font-bold text-white">{fmt(kpi.value)} ₼</p>
                    <p className="text-xs text-dark-400 mt-1">{kpi.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Profit Card */}
            <div className={`rounded-2xl p-6 border ${data.profit >= 0 ? 'bg-emerald-900/10 border-emerald-800/40' : 'bg-red-900/10 border-red-800/40'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400 mb-1">Xalis Mənfəət</p>
                  <p className={`text-4xl font-black ${data.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.profit >= 0 ? '+' : ''}{fmt(data.profit)} ₼
                  </p>
                  <p className="text-sm text-dark-400 mt-2">
                    Gəlir: {fmt(data.income)} ₼ — Xərc: {fmt(data.expenses)} ₼
                  </p>
                </div>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${data.profit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {data.profit >= 0
                    ? <TrendingUp size={40} className="text-emerald-400" />
                    : <TrendingDown size={40} className="text-red-400" />}
                </div>
              </div>
              {data.income > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-dark-400 mb-1">
                    <span>Mənfəət marjası</span>
                    <span>{((data.profit / data.income) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-dark-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${data.profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.abs((data.profit / data.income) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {data.debt > 0 && (
              <div className="bg-amber-900/10 border border-amber-800/40 rounded-2xl p-4 flex items-center gap-3">
                <TrendingDown size={20} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Ödənilməmiş Borclar</p>
                  <p className="text-xs text-dark-400">Müştərilərdən alınmalı: <span className="text-amber-400 font-bold">{fmt(data.debt)} ₼</span></p>
                </div>
              </div>
            )}

            {/* Payment Method Breakdown */}
            {payStats.length > 0 && (
              <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500/10 rounded-lg flex items-center justify-center">
                    <BarChart3 size={13} className="text-primary-400" />
                  </span>
                  Ödəniş Üsuluна Görə Satışlar
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {METHOD_CONFIG.map(mc => {
                    const stat = payStats.find(p => p.payment_method === mc.key);
                    if (!stat && !['cash','card','transfer','debt','partial'].includes(mc.key)) return null;
                    const total = stat?.total || 0;
                    const count = stat?.count || 0;
                    const paid = stat?.paid || 0;
                    const unpaid = stat?.unpaid || 0;
                    const maxTotal = Math.max(...payStats.map(p => p.total || 0), 1);
                    return (
                      <div key={mc.key} className={`bg-gradient-to-br border rounded-2xl p-4 ${mc.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-white">{mc.label}</span>
                          <span className="text-xs px-2 py-0.5 bg-dark-900/50 rounded-full text-dark-300">{count}</span>
                        </div>
                        <p className="text-lg font-bold text-white mb-1">{fmt(total)} ₼</p>
                        {unpaid > 0 && (
                          <p className="text-xs text-red-400">Qalıq: {fmt(unpaid)} ₼</p>
                        )}
                        <div className="mt-2 h-1 bg-dark-900/50 rounded-full">
                          <div className="h-1 rounded-full transition-all duration-700"
                            style={{ width: `${(total / maxTotal) * 100}%`, backgroundColor: mc.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-5">
              {/* Gəlir vs Xərc Combined Chart */}
              <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Aylıq Gəlir vs Xərc</h3>
                <p className="text-xs text-dark-500 mb-4">{new Date().getFullYear()} ili üzrə müqayisə</p>
                {combinedChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={combinedChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(v, name) => [`${v.toFixed(2)} ₼`, name]} />
                      <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Bar dataKey="Gəlir" fill="#10b981" radius={[3,3,0,0]} maxBarSize={18} />
                      <Bar dataKey="Xərc" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-dark-500 text-sm">Məlumat yoxdur</div>
                )}
              </div>

              {/* Expenses by Category Pie */}
              <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Xərclərin Bölgüsü</h3>
                {pieData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `${fmt(v)} ₼`} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {pieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-dark-400 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-medium text-white flex-shrink-0">{fmt(item.value)} ₼</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-dark-500 text-sm">Xərc yoxdur</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-dark-500">
            <DollarSign size={48} className="mx-auto mb-3 opacity-30" />
            <p>Məlumat yüklənmədi</p>
          </div>
        )}
      </div>
    </div>
  );
}
