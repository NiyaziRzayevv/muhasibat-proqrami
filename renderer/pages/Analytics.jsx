import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users,
  Package, RefreshCw, Calendar, BarChart2, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrencySymbol } from '../utils/currency';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

function fmt(n) { return Number(n || 0).toFixed(2); }

export default function Analytics() {
  const { currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-xs text-dark-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
            {p.name}: {p.value?.toFixed ? p.value.toFixed(2) : p.value} {csym}
          </p>
        ))}
      </div>
    );
  };
  const userId = isAdmin ? null : currentUser?.id;
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, sales: 0, customers: 0, prevRevenue: 0, prevExpenses: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const days = parseInt(range);
      const startDate = new Date(today); startDate.setDate(today.getDate() - days);
      const prevStart = new Date(startDate); prevStart.setDate(startDate.getDate() - days);
      const fmt_date = d => d.toISOString().split('T')[0];

      const [salesRes, expRes, productsRes] = await Promise.all([
        apiBridge.getSales({ startDate: fmt_date(startDate), endDate: fmt_date(today), userId }),
        apiBridge.getExpenses({ startDate: fmt_date(startDate), endDate: fmt_date(today), userId }),
        apiBridge.getProducts({ userId }),
      ]);

      const sales = salesRes.success ? salesRes.data || [] : [];
      const expenses = expRes.success ? expRes.data || [] : [];
      const products = productsRes.success ? productsRes.data || [] : [];

      // Group sales by date
      const salesByDate = {};
      const expByDate = {};
      for (let i = days; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = fmt_date(d);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        salesByDate[key] = { date: label, revenue: 0, count: 0 };
        expByDate[key] = { date: label, expense: 0 };
      }
      sales.forEach(s => {
        const d = s.date?.split('T')[0] || s.date;
        if (salesByDate[d]) {
          salesByDate[d].revenue += s.total || 0;
          salesByDate[d].count += 1;
        }
      });
      expenses.forEach(e => {
        const d = e.date?.split('T')[0] || e.date;
        if (expByDate[d]) expByDate[d].expense += e.amount || 0;
      });

      const combinedData = Object.keys(salesByDate).map(key => ({
        ...salesByDate[key],
        expense: expByDate[key]?.expense || 0,
        profit: (salesByDate[key]?.revenue || 0) - (expByDate[key]?.expense || 0),
      }));

      // Top products from sales items
      const productRevenue = {};
      sales.forEach(s => {
        (s.items || []).forEach(item => {
          if (!productRevenue[item.product_name]) productRevenue[item.product_name] = { name: item.product_name, revenue: 0, qty: 0 };
          productRevenue[item.product_name].revenue += item.total || 0;
          productRevenue[item.product_name].qty += item.qty || 0;
        });
      });
      const topProds = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

      // Payment methods breakdown
      const payMethods = {};
      sales.forEach(s => {
        const m = s.payment_method || 'digər';
        if (!payMethods[m]) payMethods[m] = 0;
        payMethods[m] += s.total || 0;
      });
      const payArr = Object.entries(payMethods).map(([name, value], i) => ({
        name: { cash: 'Nağd', card: 'Kart', transfer: 'Köçürmə', debt: 'Borc', partial: 'Qismən' }[name] || name,
        value, color: COLORS[i % COLORS.length]
      }));

      const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
      const totalExpenses = expenses.reduce((s, r) => s + (r.amount || 0), 0);
      const uniqueCustomers = new Set(sales.filter(s => s.customer_id).map(s => s.customer_id)).size;

      setSalesData(combinedData);
      setExpensesData(combinedData);
      setTopProducts(topProds);
      setPaymentMethods(payArr);
      setSummary({ revenue: totalRevenue, expenses: totalExpenses, sales: sales.length, customers: uniqueCustomers });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const profit = summary.revenue - summary.expenses;
  const profitMargin = summary.revenue > 0 ? (profit / summary.revenue * 100).toFixed(1) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart2 size={22} className="text-primary-400" /> Analitika
          </h1>
          <p className="text-sm text-dark-400 mt-0.5">Detallı biznes analizi</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-dark-800 rounded-xl p-1 gap-1">
            {[
              { v: '7', l: '7 gün' },
              { v: '30', l: '30 gün' },
              { v: '90', l: '3 ay' },
            ].map(r => (
              <button key={r.v} onClick={() => setRange(r.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === r.v ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
                {r.l}
              </button>
            ))}
          </div>
          <button onClick={loadData} disabled={loading} className="btn-secondary text-xs py-1.5 w-8 h-8 p-0 flex items-center justify-center">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ümumi Gəlir', value: `${fmt(summary.revenue)} ${csym}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/30' },
          { label: 'Ümumi Xərc', value: `${fmt(summary.expenses)} ${csym}`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-900/20 border-red-800/30' },
          { label: `Mənfəət (${profitMargin}%)`, value: `${fmt(profit)} ${csym}`, icon: DollarSign, color: profit >= 0 ? 'text-emerald-400' : 'text-red-400', bg: profit >= 0 ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-red-900/20 border-red-800/30' },
          { label: 'Satış sayı', value: summary.sales, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/30' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`card p-4 border ${kpi.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-dark-400">{kpi.label}</p>
                <Icon size={16} className={kpi.color} />
              </div>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="card p-5 mb-4">
        <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" /> Gəlir / Xərc / Mənfəət Trendi
        </p>
        {loading ? (
          <div className="h-48 flex items-center justify-center"><div className="loading-spinner w-8 h-8" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={Math.floor(salesData.length / 7)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} name="Gəlir" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} name="Xərc" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Row: Top Products + Payment Methods */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Package size={14} className="text-primary-400" /> Ən Çox Satılan Məhsullar
          </p>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="loading-spinner w-8 h-8" /></div>
          ) : topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-dark-500 text-sm">Məlumat yoxdur</div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => {
                const maxRev = topProducts[0]?.revenue || 1;
                const pct = (p.revenue / maxRev * 100).toFixed(0);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dark-300 truncate max-w-[160px] flex items-center gap-1">
                        <span className="text-dark-600 font-mono w-4 text-right flex-shrink-0">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-xs font-semibold text-white flex-shrink-0">{fmt(p.revenue)} {csym}</span>
                    </div>
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <PieChartIcon size={14} className="text-purple-400" /> Ödəniş Üsulları
          </p>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="loading-spinner w-8 h-8" /></div>
          ) : paymentMethods.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-dark-500 text-sm">Məlumat yoxdur</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={paymentMethods} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {paymentMethods.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${fmt(v)} ${csym}`} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {paymentMethods.map((p, i) => {
                  const total = paymentMethods.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? (p.value / total * 100).toFixed(0) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs text-dark-300">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-white">{pct}%</span>
                        <p className="text-[10px] text-dark-500">{fmt(p.value)} {csym}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
