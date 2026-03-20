import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Calendar, Wrench, Star, Car, CreditCard, Users,
  RefreshCw, ArrowRight, Clock, CheckCircle, TrendingDown, Bell, Key,
  ShoppingCart, Plus, Wallet, FileText, BarChart2, Zap, Send, Loader2, Bot
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Area, AreaChart
} from 'recharts';
import StatCard from '../components/StatCard';
import UniversalSmartInput from '../components/UniversalSmartInput';
import { Package, AlertTriangle, ShoppingBag, Percent, Target, Activity } from 'lucide-react';
import { useApp } from '../App';
import { getCurrencySymbol } from '../utils/currency';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, isAdmin, showNotification, currency } = useApp();
  const { t, translations } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const userId = isAdmin ? null : currentUser?.id;

  const MONTHS_SHORT = translations.monthsShort || ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
  const PAYMENT_STATUS_MAP = {
    odenilib: { label: t('statusPaid'), cls: 'status-odenilib' },
    gozleyir: { label: t('statusWaiting'), cls: 'status-gozleyir' },
    qismen: { label: t('statusPartial'), cls: 'status-qismen' },
    borc: { label: t('statusDebt'), cls: 'status-borc' },
  };
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState(null);
  const [monthStats, setMonthStats] = useState(null);
  const [allStats, setAllStats] = useState(null);
  const [topServices, setTopServices] = useState([]);
  const [topBrands, setTopBrands] = useState([]);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stockValue, setStockValue] = useState(null);
  const [todaySales, setTodaySales] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [yearlyRevenue, setYearlyRevenue] = useState([]);
  const [debtStats, setDebtStats] = useState(null);
  const [productStats, setProductStats] = useState(null);
  const [todayExpenses, setTodayExpenses] = useState(null);
  const [monthExpenses, setMonthExpenses] = useState(null);
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [taskStats, setTaskStats] = useState(null);
  const [liveTime, setLiveTime] = useState(new Date());
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Listen for update events
  useEffect(() => {
    if (!window.api?.onUpdaterStatus) return;
    const unsub = window.api.onUpdaterStatus((data) => {
      setUpdateStatus(data.status);
      if (data.status === 'available') {
        setUpdateInfo(data);
        setUpdateDismissed(false);
      }
      if (data.status === 'downloading') setUpdateProgress(data.percent || 0);
      if (data.status === 'downloaded') setUpdateInfo(prev => ({ ...prev, ...data }));
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    try {
      const [
        todayRes, monthRes, allRes, topSvcRes, topBrandRes, chartRes,
        recentRes, licRes, lowStockRes, stockValRes, salesRes,
        debtRes, prodRes, expTodayRes, expMonthRes, taskRes, unreadRes,
        appointRes, activeTaskRes, custRes, notifCheckRes
      ] = await Promise.all([
        apiBridge.getTodayStats(userId),
        apiBridge.getMonthStats(year, month, userId),
        apiBridge.getAllTimeStats(userId),
        apiBridge.getTopServices(8, userId),
        apiBridge.getTopBrands(8, userId),
        apiBridge.getMonthlyChart(year, userId),
        apiBridge.getRecords({ limit: 8, offset: 0, orderBy: 'date', orderDir: 'desc', userId }),
        apiBridge.getLicenseStatus(),
        apiBridge.getLowStockProducts(userId),
        apiBridge.getStockValue(userId),
        apiBridge.getSalesStats(now.toISOString().split('T')[0], now.toISOString().split('T')[0], userId),
        apiBridge.getDebtStats(userId),
        apiBridge.getProductStats(userId),
        apiBridge.getExpenseStats(now.toISOString().split('T')[0], now.toISOString().split('T')[0], userId),
        apiBridge.getExpenseStats(`${year}-${String(month).padStart(2,'0')}-01`, now.toISOString().split('T')[0], userId),
        apiBridge.getTaskStats(userId),
        apiBridge.getUnreadCount(userId),
        apiBridge.getUpcomingAppointments(3, userId),
        apiBridge.getActiveTasks(userId),
        apiBridge.getCustomers(null, userId),
        apiBridge.checkSystemNotifications(userId),
      ]);

      if (todayRes.success) setTodayStats(todayRes.data);
      if (monthRes.success) setMonthStats(monthRes.data);
      if (allRes.success) setAllStats(allRes.data);
      if (topSvcRes.success) setTopServices(topSvcRes.data || []);
      if (topBrandRes.success) setTopBrands(topBrandRes.data || []);
      if (chartRes.success && chartRes.data) {
        setMonthlyChart((chartRes.data || []).map(c => ({
          name: MONTHS_SHORT[parseInt(c.month) - 1],
          total: c.total,
          count: c.count,
        })));
      }
      if (recentRes.success) setRecentRecords(recentRes.data);
      if (licRes.success) setLicenseStatus(licRes.data);
      if (lowStockRes.success) setLowStockProducts(lowStockRes.data || []);
      if (stockValRes.success) setStockValue(stockValRes.data);
      if (salesRes.success) setTodaySales(salesRes.data);
      if (debtRes.success) setDebtStats(debtRes.data);
      if (prodRes.success) setProductStats(prodRes.data);
      if (expTodayRes.success) setTodayExpenses(expTodayRes.data);
      if (expMonthRes.success) setMonthExpenses(expMonthRes.data);
      if (taskRes.success) setTaskStats(taskRes.data);
      if (unreadRes.success) setUnreadNotifs(unreadRes.data || 0);
      if (appointRes.success) setUpcomingAppointments(appointRes.data || []);
      if (activeTaskRes.success) setActiveTasks(activeTaskRes.data || []);
      if (custRes.success) setCustomerCount(Array.isArray(custRes.data) ? custRes.data.length : 0);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs shadow-xl">
          <p className="text-dark-300 mb-1">{label}</p>
          <p className="text-primary-400 font-semibold">{fmt(payload[0]?.value)}</p>
          <p className="text-dark-400">{payload[0]?.payload?.count} {t('record')}</p>
        </div>
      );
    }
    return null;
  };

  async function handleSendTelegram() {
    setSendingTelegram(true);
    try {
      if (!window.api?.sendTelegramReport) {
        showNotification(t('telegramOnlyElectron'), 'error');
        return;
      }
      const res = await window.api.sendTelegramReport(userId);
      if (res.success) showNotification(t('telegramSent'), 'success');
      else showNotification(t('error') + ': ' + res.error, 'error');
    } catch (e) { showNotification(t('error') + ': ' + e.message, 'error'); }
    finally { setSendingTelegram(false); }
  }

  return (
    <div className="min-h-full">
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">

      {/* UPDATE BANNER */}
      {updateStatus && updateStatus !== 'up-to-date' && updateStatus !== 'checking' && updateStatus !== 'error' && !updateDismissed && (() => {
        const version = updateInfo?.version || '?';
        const releaseNotes = updateInfo?.releaseNotes || '';
        const changeItems = releaseNotes.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''));
        return (
          <div className="bg-gradient-to-r from-primary-900/30 via-dark-800/80 to-dark-900 border border-primary-700/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full -mr-20 -mt-20 blur-2xl" />
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center"><Zap size={18} className="text-primary-400" /></div>
                <div>
                  <p className="text-sm font-bold text-white">{updateStatus === 'downloaded' ? 'Yeniləmə hazırdır!' : updateStatus === 'downloading' ? 'Yüklənir...' : `Yeni versiya: v${version}`}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 mt-0.5 inline-block">v{version}</span>
                </div>
              </div>
              <button onClick={() => setUpdateDismissed(true)} className="text-dark-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-dark-700/50 transition-colors">Bağla</button>
            </div>
            {changeItems.length > 0 && (<div className="space-y-1 mb-3">{changeItems.map((item, i) => (<div key={i} className="flex items-center gap-2 text-xs text-dark-300"><CheckCircle size={10} className="text-primary-400 shrink-0" />{item}</div>))}</div>)}
            {updateStatus === 'downloading' && (<div className="mb-3"><div className="w-full h-1 bg-dark-700 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${updateProgress}%` }} /></div></div>)}
            <div className="flex gap-2">
              {updateStatus === 'available' && (<button onClick={() => window.api?.downloadUpdate?.()} className="py-2 px-4 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors"><ArrowRight size={12} className="inline mr-1" />Yüklə</button>)}
              {updateStatus === 'downloaded' && (<button onClick={() => window.api?.installUpdate?.()} className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"><RefreshCw size={12} className="inline mr-1" />Yenilə</button>)}
            </div>
          </div>
        );
      })()}

      {/* SÜRƏTLI ƏMƏLİYYATLAR */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 mr-2">
          <Zap size={14} className="text-amber-400" />
          <span className="text-[11px] font-bold text-dark-400 uppercase tracking-widest">{t('smartAdd') || 'Sürətli əməliyyatlar'}</span>
        </div>
        {[
          { label: '+  ' + (t('posSale') || 'Satış'), icon: ShoppingCart, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20', path: '/pos' },
          { label: '+  ' + (t('customer') || 'Müştəri'), icon: Users, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20', path: '/customers' },
          { label: '+  ' + (t('products') || 'Məhsul'), icon: Package, cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20', path: '/products' },
          { label: '+  ' + (t('addExpense') || 'Xərc'), icon: TrendingDown, cls: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20', path: '/expenses' },
          { label: (t('debts') || 'Borc'), icon: CreditCard, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20', path: '/debts' },
          { label: (t('analytics') || 'Analiz'), icon: BarChart2, cls: 'bg-dark-700/60 text-dark-300 border-dark-600/40 hover:bg-dark-700', path: '/analytics' },
        ].map(a => { const I = a.icon; return (
          <button key={a.path} onClick={() => navigate(a.path)} className={`flex items-center gap-1.5 ${a.cls} border font-semibold py-1.5 px-3 rounded-lg text-[11px] transition-all`}><I size={12} />{a.label}</button>
        ); })}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => navigate('/ai-assistant')} title="AI Köməkçi" className="w-8 h-8 rounded-lg bg-dark-800/60 border border-dark-700/40 flex items-center justify-center text-dark-400 hover:text-primary-400 transition-colors">
            <Bot size={13} />
          </button>
          <button onClick={loadData} disabled={loading} className="w-8 h-8 rounded-lg bg-dark-800/60 border border-dark-700/40 flex items-center justify-center text-dark-400 hover:text-white transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4 ƏSAS GƏLİR KARTI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-dark-800/90 to-dark-900 border border-emerald-500/20 rounded-2xl p-5 cursor-pointer hover:border-emerald-400/40 transition-all" onClick={() => navigate('/records')}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/8 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all duration-500" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center"><DollarSign size={20} className="text-emerald-400" /></div>
            <span className="text-emerald-400 text-[10px] font-bold">{todayStats?.count || 0} {t('recordsThisDay')}</span>
          </div>
          <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-widest mb-1">{t('todayRevenue')}</p>
          <p className="text-2xl font-black text-white tracking-tight">{csym}{fmt(todayStats?.revenue)}</p>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-dark-800/90 to-dark-900 border border-blue-500/20 rounded-2xl p-5 cursor-pointer hover:border-blue-400/40 transition-all" onClick={() => navigate('/records')}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/8 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all duration-500" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center"><Calendar size={20} className="text-blue-400" /></div>
            <span className="text-blue-400 text-[10px] font-bold">{monthStats?.count || 0} {t('recordsThisMonth')}</span>
          </div>
          <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-widest mb-1">{t('monthlyRevenue')}</p>
          <p className="text-2xl font-black text-white tracking-tight">{csym}{fmt(monthStats?.revenue)}</p>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-dark-800/90 to-dark-900 border border-purple-500/20 rounded-2xl p-5 cursor-pointer hover:border-purple-400/40 transition-all" onClick={() => navigate('/records')}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/8 rounded-full blur-2xl group-hover:bg-purple-500/15 transition-all duration-500" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center"><TrendingUp size={20} className="text-purple-400" /></div>
            <span className="text-purple-400 text-[10px] font-bold">{allStats?.count || 0} {t('totalRecords')}</span>
          </div>
          <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-widest mb-1">{t('totalRevenue')}</p>
          <p className="text-2xl font-black text-white tracking-tight">{csym}{fmt(allStats?.revenue)}</p>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-red-500/10 via-dark-800/90 to-dark-900 border border-red-500/20 rounded-2xl p-5 cursor-pointer hover:border-red-400/40 transition-all" onClick={() => navigate('/debts')}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-red-500/8 rounded-full blur-2xl group-hover:bg-red-500/15 transition-all duration-500" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center"><CreditCard size={20} className="text-red-400" /></div>
            <span className="text-red-400 text-[10px] font-bold">{t('pendingAmount')}</span>
          </div>
          <p className="text-[10px] font-semibold text-dark-400 uppercase tracking-widest mb-1">{t('unpaid')}</p>
          <p className="text-2xl font-black text-red-300 tracking-tight">{csym}{fmt(allStats?.debt)}</p>
        </div>
      </div>

      {/* CHART + SON ƏMƏLİYYATLAR */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white">{t('monthlyRevenueChart')}</h3>
            </div>
            <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">{new Date().getFullYear()}</span>
          </div>
          {monthlyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b50" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `${csym}${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f640', strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#dashGrad)" strokeWidth={2.5} dot={{ fill: '#1e3a8a', stroke: '#3b82f6', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-dark-500 text-sm">{t('noData')}</div>
          )}
        </div>

        <div className="xl:col-span-2 bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-primary-400" />
              <h3 className="text-sm font-bold text-white">{t('recentRecords')}</h3>
            </div>
            <button onClick={() => navigate('/records')} className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">{t('all')} <ArrowRight size={10} /></button>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[280px] pr-1">
            {recentRecords.length === 0 ? (<p className="text-dark-500 text-xs text-center py-10">{t('noData')}</p>) : recentRecords.slice(0, 8).map(r => (
              <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-dark-700/30 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.payment_status === 'odenilib' ? 'bg-emerald-500/15' : r.payment_status === 'borc' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                  {r.payment_status === 'odenilib' ? <DollarSign size={14} className="text-emerald-400" /> : r.payment_status === 'borc' ? <CreditCard size={14} className="text-red-400" /> : <Clock size={14} className="text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white truncate">{r.service_type || r.customer_name || '—'}</p>
                    <span className="text-[9px] text-dark-500 shrink-0">{r.date?.slice(5)}</span>
                  </div>
                  <p className="text-[10px] text-dark-400 truncate">{r.customer_name || '—'}</p>
                  <p className={`text-xs font-bold mt-0.5 ${r.payment_status === 'odenilib' ? 'text-emerald-400' : r.payment_status === 'borc' ? 'text-red-400' : 'text-amber-400'}`}>{fmt(r.total_price)} {csym}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3 MINI KART: Bugünkü İş + Müştəri + Top Xidmət */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5 cursor-pointer hover:border-cyan-500/30 transition-colors" onClick={() => navigate('/records')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center"><Wrench size={15} className="text-cyan-400" /></div><span className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">{t('todayWork')}</span></div>
          </div>
          <p className="text-3xl font-black text-white">{todayStats?.count || 0}</p>
          <p className="text-[10px] text-dark-500 mt-1">{todayStats?.count > 0 ? `${fmt(todayStats?.revenue)} ${csym}` : t('noData')}</p>
        </div>
        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/30 transition-colors" onClick={() => navigate('/customers')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center"><Users size={15} className="text-indigo-400" /></div><span className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">{t('customer')}</span></div>
          </div>
          <p className="text-3xl font-black text-white">{customerCount}</p>
          <p className="text-[10px] text-dark-500 mt-1">{t('totalCustomers')}</p>
        </div>
        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5 cursor-pointer hover:border-orange-500/30 transition-colors" onClick={() => navigate('/records')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center"><Star size={15} className="text-orange-400" /></div><span className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">{t('topService')}</span></div>
          </div>
          <p className="text-lg font-black text-white truncate">{topServices[0]?.service_type || '—'}</p>
          <p className="text-[10px] text-dark-500 mt-1">{topServices[0] ? `${topServices[0].count} ${t('times')}` : ''}</p>
        </div>
      </div>

      {/* 4 MİNİ KART: Satış + Xərc + Anbar + Stok */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/5 to-dark-900 border border-emerald-500/15 rounded-2xl p-4 cursor-pointer hover:border-emerald-400/30 transition-all" onClick={() => navigate('/sales')}>
          <div className="flex items-center gap-2 mb-2"><ShoppingBag size={13} className="text-emerald-400" /><span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest">{t('todaySales')}</span></div>
          <p className="text-xl font-black text-white">{fmt(todaySales?.revenue)}<span className="text-[10px] text-dark-500 ml-1">{csym}</span></p>
          <p className="text-[9px] text-dark-500 mt-0.5">{todaySales?.count || 0} {t('salesToday')}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/5 to-dark-900 border border-red-500/15 rounded-2xl p-4 cursor-pointer hover:border-red-400/30 transition-all" onClick={() => navigate('/expenses')}>
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={13} className="text-red-400" /><span className="text-[9px] font-bold text-red-400/70 uppercase tracking-widest">{t('todayExpense')}</span></div>
          <p className="text-xl font-black text-red-300">{fmt(todayExpenses?.total)}<span className="text-[10px] text-dark-500 ml-1">{csym}</span></p>
          <p className="text-[9px] text-dark-500 mt-0.5">{todayExpenses?.count || 0} {t('operations')}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500/5 to-dark-900 border border-violet-500/15 rounded-2xl p-4 cursor-pointer hover:border-violet-400/30 transition-all" onClick={() => navigate('/products')}>
          <div className="flex items-center gap-2 mb-2"><Package size={13} className="text-violet-400" /><span className="text-[9px] font-bold text-violet-400/70 uppercase tracking-widest">{t('warehouseValue')}</span></div>
          <p className="text-xl font-black text-white">{fmt(stockValue?.sell_value)}<span className="text-[10px] text-dark-500 ml-1">{csym}</span></p>
          <p className="text-[9px] text-dark-500 mt-0.5">{stockValue?.total_units || 0} {t('warehouseProducts')}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500/5 to-dark-900 border border-rose-500/15 rounded-2xl p-4 cursor-pointer hover:border-rose-400/30 transition-all" onClick={() => navigate('/products')}>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={13} className="text-rose-400" /><span className="text-[9px] font-bold text-rose-400/70 uppercase tracking-widest">{t('lowStock')}</span></div>
          <p className="text-xl font-black text-rose-300">{lowStockProducts.length || 0}</p>
          <p className="text-[9px] text-dark-500 mt-0.5">{t('belowLimit')}</p>
        </div>
      </div>

      {/* AŞAĞI STOK */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-950/15 border border-amber-800/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2"><AlertTriangle size={12} />{t('lowStockWarning')} ({lowStockProducts.length})</h3>
            <button onClick={() => navigate('/products')} className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center gap-1">{t('all')} <ArrowRight size={10} /></button>
          </div>
          <div className="flex flex-wrap gap-2">{lowStockProducts.slice(0, 8).map(p => (<div key={p.id} className="flex items-center gap-1.5 bg-amber-900/15 border border-amber-800/20 rounded-lg px-2.5 py-1"><Package size={10} className="text-amber-500" /><span className="text-[10px] text-amber-300 font-medium">{p.name}</span><span className="text-[10px] text-amber-500/70">{p.stock_qty}/{p.min_stock}</span></div>))}</div>
        </div>
      )}

      {/* RANDEVULAR + TAPŞIRIQLAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Calendar size={15} className="text-cyan-400" /><h3 className="text-sm font-bold text-white">{t('upcomingAppointments')}</h3>{upcomingAppointments.length > 0 && <span className="text-[9px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">{upcomingAppointments.length}</span>}</div>
            <button onClick={() => navigate('/appointments')} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">{t('all')} <ArrowRight size={10} /></button>
          </div>
          {upcomingAppointments.length > 0 ? (<div className="space-y-2">{upcomingAppointments.slice(0, 4).map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2.5 bg-dark-700/20 hover:bg-dark-700/40 rounded-xl transition-colors">
              <div className="text-center w-11 shrink-0"><p className="text-xs font-bold text-white">{a.time || '—'}</p><p className="text-[9px] text-dark-500">{a.date === new Date().toISOString().split('T')[0] ? t('today') : a.date?.slice(5)}</p></div>
              <div className="flex-1 min-w-0"><p className="text-xs text-white font-semibold truncate">{a.title}</p>{a.customer_name && <p className="text-[10px] text-dark-400">{a.customer_name}</p>}</div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.status === 'confirmed' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'}`}>{a.status === 'confirmed' ? t('confirmed') : t('waiting')}</span>
            </div>
          ))}</div>) : (<div className="text-center py-8"><Calendar size={20} className="mx-auto mb-2 text-dark-600" /><p className="text-[10px] text-dark-500">{t('noUpcomingAppointments')}</p></div>)}
        </div>

        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><CheckCircle size={15} className="text-purple-400" /><h3 className="text-sm font-bold text-white">{t('activeTasks')}</h3>{taskStats && <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">{(taskStats.todo || 0) + (taskStats.in_progress || 0)}</span>}</div>
            <button onClick={() => navigate('/tasks')} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">{t('all')} <ArrowRight size={10} /></button>
          </div>
          {taskStats && (<div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-dark-700/20 rounded-lg"><p className="text-lg font-black text-white">{taskStats.todo || 0}</p><p className="text-[9px] text-dark-500">{t('waiting')}</p></div>
            <div className="text-center p-2 bg-amber-500/8 rounded-lg"><p className="text-lg font-black text-amber-400">{taskStats.in_progress || 0}</p><p className="text-[9px] text-dark-500">{t('continuing')}</p></div>
            <div className="text-center p-2 bg-emerald-500/8 rounded-lg"><p className="text-lg font-black text-emerald-400">{taskStats.done || 0}</p><p className="text-[9px] text-dark-500">{t('done')}</p></div>
          </div>)}
          {activeTasks.length > 0 ? (<div className="space-y-2">{activeTasks.slice(0, 4).map(tk => {
            const isOd = tk.due_date && tk.due_date < new Date().toISOString().split('T')[0];
            return (<div key={tk.id} className="flex items-center gap-3 p-2.5 bg-dark-700/20 hover:bg-dark-700/40 rounded-xl transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${tk.priority === 'high' ? 'bg-red-400' : tk.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
              <div className="flex-1 min-w-0"><p className="text-xs text-white font-semibold truncate">{tk.title}</p>{tk.due_date && <p className={`text-[9px] ${isOd ? 'text-red-400' : 'text-dark-500'}`}>{tk.due_date}</p>}</div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tk.status === 'in_progress' ? 'bg-amber-500/15 text-amber-400' : 'bg-dark-600/50 text-dark-400'}`}>{tk.status === 'in_progress' ? t('continuing') : t('waiting')}</span>
            </div>);
          })}</div>) : (<div className="text-center py-6"><CheckCircle size={20} className="mx-auto mb-2 text-dark-600" /><p className="text-[10px] text-dark-500">{t('noActiveTasks')}</p></div>)}
        </div>
      </div>

      {/* TOP XİDMƏTLƏR + MARKALAR + BORC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><Star size={15} className="text-orange-400" /><h3 className="text-sm font-bold text-white">{t('topServices')}</h3></div>
          {topServices.length > 0 ? (<div className="space-y-2">{topServices.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-[10px] font-black text-dark-500 w-4 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0"><p className="text-xs text-white font-medium truncate">{s.service_type}</p><div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${(s.count / (topServices[0]?.count || 1)) * 100}%` }} /></div></div>
              <span className="text-xs text-white font-bold shrink-0">{s.count}</span>
            </div>
          ))}</div>) : (<p className="text-dark-500 text-xs">{t('noData')}</p>)}
        </div>

        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><Car size={15} className="text-emerald-400" /><h3 className="text-sm font-bold text-white">{t('topBrands')}</h3></div>
          {topBrands.length > 0 ? (<div className="space-y-2">{topBrands.slice(0, 5).map((b, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-[10px] font-black text-dark-500 w-4 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0"><p className="text-xs text-white font-medium">{b.car_brand}</p><div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${(b.count / (topBrands[0]?.count || 1)) * 100}%` }} /></div></div>
              <span className="text-xs text-white font-bold shrink-0">{b.count}</span>
            </div>
          ))}</div>) : (<p className="text-dark-500 text-xs">{t('noData')}</p>)}
        </div>

        <div className="bg-dark-800/40 border border-dark-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><CreditCard size={15} className="text-violet-400" /><h3 className="text-sm font-bold text-white">{t('paymentStatus')}</h3></div>
          {debtStats ? (<div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl"><div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /><span className="text-xs text-emerald-300 font-medium">{t('paid')}</span></div><span className="text-sm text-white font-bold">{fmt(debtStats.paid)}</span></div>
            <div className="flex items-center justify-between p-3 bg-amber-500/8 border border-amber-500/15 rounded-xl"><div className="flex items-center gap-2"><Clock size={14} className="text-amber-400" /><span className="text-xs text-amber-300 font-medium">{t('waiting')}</span></div><span className="text-sm text-white font-bold">{fmt(debtStats.pending)}</span></div>
            <div className="flex items-center justify-between p-3 bg-red-500/8 border border-red-500/15 rounded-xl"><div className="flex items-center gap-2"><AlertTriangle size={14} className="text-red-400" /><span className="text-xs text-red-300 font-medium">{t('debt')}</span></div><span className="text-sm text-red-300 font-bold">{fmt(debtStats.debt)}</span></div>
          </div>) : (<p className="text-dark-500 text-xs">{t('noData')}</p>)}
        </div>
      </div>

      </div>
    </div>
  );
}
