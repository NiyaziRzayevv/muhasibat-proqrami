import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Calendar, Wrench, Star, Car, CreditCard, Users,
  RefreshCw, ArrowRight, Clock, CheckCircle, TrendingDown, Bell, Key,
  ShoppingCart, Plus, Wallet, FileText, BarChart2, Zap, Send, Loader2
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
        debtRes, prodRes, expTodayRes, expMonthRes, taskRes, unreadRes
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
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1800px] mx-auto p-5 space-y-5">

      {/* UPDATE NOTIFICATION BANNER */}
      {updateStatus && updateStatus !== 'up-to-date' && updateStatus !== 'checking' && updateStatus !== 'error' && !updateDismissed && (() => {
        const version = updateInfo?.version || '?';
        const releaseNotes = updateInfo?.releaseNotes || '';
        const changeItems = releaseNotes.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''));
        return (
          <div className="bg-gradient-to-r from-primary-900/40 to-primary-950/60 border border-primary-700/30 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -mr-16 -mt-16" />
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Zap size={16} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {updateStatus === 'downloaded' ? 'Yeniləmə hazırdır!' : updateStatus === 'downloading' ? 'Yüklənir...' : `Yeni versiya mövcuddur: v${version}`}
                  </p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">v{version}</span>
                </div>
              </div>
              <button onClick={() => setUpdateDismissed(true)} className="text-dark-500 hover:text-white transition-colors p-1">
                <span className="text-xs">Bağla</span>
              </button>
            </div>
            {changeItems.length > 0 && (
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">Dəyişikliklər:</p>
                {changeItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 bg-dark-800/40 rounded-lg px-3 py-2">
                    <CheckCircle size={12} className="text-primary-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-dark-200">{item}</span>
                  </div>
                ))}
              </div>
            )}
            {updateStatus === 'downloading' && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-dark-400 mb-1">
                  <span>Yüklənir...</span>
                  <span>{updateProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300" style={{ width: `${updateProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {updateStatus === 'available' && (
                <button onClick={() => window.api?.downloadUpdate?.()} className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors">
                  <ArrowRight size={12} /> Yüklə və yenilə
                </button>
              )}
              {updateStatus === 'downloaded' && (
                <button onClick={() => window.api?.installUpdate?.()} className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors">
                  <RefreshCw size={12} /> Yenidən başlat və yenilə
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* SÜRƏTLI ƏMƏLİYYATLAR */}
      <div className="bg-dark-800/50 border border-dark-700/40 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-dark-300 uppercase tracking-wider">{t('smartAdd') || 'Sürətli əməliyyatlar'}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleSendTelegram} disabled={sendingTelegram} className="text-dark-500 hover:text-blue-400 transition-colors">
              {sendingTelegram ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
            <button onClick={loadData} disabled={loading} className="text-dark-500 hover:text-white transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t('posSale') || 'Satış', icon: ShoppingCart, gradient: 'from-emerald-600 to-emerald-500', path: '/pos' },
            { label: t('customer') || 'Müştəri', icon: Users, gradient: 'from-blue-600 to-blue-500', path: '/customers' },
            { label: t('products') || 'Məhsul', icon: Package, gradient: 'from-violet-600 to-violet-500', path: '/products' },
            { label: t('addExpense') || 'Xərc', icon: TrendingDown, gradient: 'from-red-600 to-red-500', path: '/expenses' },
            { label: t('debts') || 'Borc', icon: CreditCard, gradient: 'from-amber-600 to-amber-500', path: '/debts' },
            { label: t('analytics') || 'Analiz', icon: BarChart2, gradient: 'from-cyan-600 to-cyan-500', path: '/analytics' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.path} onClick={() => navigate(a.path)}
                className={`flex items-center gap-2 bg-gradient-to-r ${a.gradient} text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`}>
                <Icon size={14} /> {a.label}
              </button>
            );
          })}
        </div>
      </div>

        {/* GƏLİR DETAYLARI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 border border-emerald-700/30 rounded-2xl p-5 hover:border-emerald-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/20 cursor-pointer" onClick={() => navigate('/records')}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <DollarSign size={20} className="text-emerald-400" />
              </div>
              <p className="text-xs font-medium text-emerald-300/80 uppercase tracking-wider">{t('todayRevenue')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{fmt(todayStats?.revenue)}</p>
            <p className="text-xs text-emerald-400/70">{todayStats?.count || 0} {t('recordsThisDay')}</p>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 rounded-2xl p-5 hover:border-blue-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 cursor-pointer" onClick={() => navigate('/records')}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Calendar size={20} className="text-blue-400" />
              </div>
              <p className="text-xs font-medium text-blue-300/80 uppercase tracking-wider">{t('monthlyRevenue')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{fmt(monthStats?.revenue)}</p>
            <p className="text-xs text-blue-400/70">{monthStats?.count || 0} {t('recordsThisMonth')}</p>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-950/60 border border-purple-700/30 rounded-2xl p-5 hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20 cursor-pointer" onClick={() => navigate('/records')}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-400" />
              </div>
              <p className="text-xs font-medium text-purple-300/80 uppercase tracking-wider">{t('totalRevenue')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{fmt(allStats?.revenue)}</p>
            <p className="text-xs text-purple-400/70">{allStats?.count || 0} {t('totalRecords')}</p>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-900/40 to-amber-950/60 border border-amber-700/30 rounded-2xl p-5 hover:border-amber-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/20 cursor-pointer" onClick={() => navigate('/debts')}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CreditCard size={20} className="text-amber-400" />
              </div>
              <p className="text-xs font-medium text-amber-300/80 uppercase tracking-wider">{t('unpaid')}</p>
            </div>
            <p className="text-2xl font-bold text-amber-300 mb-1">{fmt(allStats?.debt)}</p>
            <p className="text-xs text-amber-400/70">{t('pendingAmount')}</p>
          </div>
        </div>

        {/* İŞ STATİSTİKASI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group bg-gradient-to-br from-cyan-900/30 to-dark-800/80 border border-cyan-800/20 rounded-2xl p-5 hover:border-cyan-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/records')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Wrench size={20} className="text-cyan-400" />
              </div>
              <p className="text-xs font-medium text-cyan-300/80 uppercase tracking-wider">{t('todayWork')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{todayStats?.count || 0}</p>
            <p className="text-xs text-cyan-400/70">{t('operation')}</p>
          </div>

          <div className="group bg-gradient-to-br from-indigo-900/30 to-dark-800/80 border border-indigo-800/20 rounded-2xl p-5 hover:border-indigo-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/customers')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Users size={20} className="text-indigo-400" />
              </div>
              <p className="text-xs font-medium text-indigo-300/80 uppercase tracking-wider">{t('customer')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{customerCount}</p>
            <p className="text-xs text-indigo-400/70">{t('totalCustomers')}</p>
          </div>

          <div className="group bg-gradient-to-br from-orange-900/30 to-dark-800/80 border border-orange-800/20 rounded-2xl p-5 hover:border-orange-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/records')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Star size={20} className="text-orange-400" />
              </div>
              <p className="text-xs font-medium text-orange-300/80 uppercase tracking-wider">{t('topService')}</p>
            </div>
            <p className="text-lg font-bold text-white mb-1 truncate">{topServices[0]?.service_type?.split(' ').slice(0, 2).join(' ') || '—'}</p>
            <p className="text-xs text-orange-400/70">{topServices[0] ? `${topServices[0].count} ${t('times')}` : ''}</p>
          </div>

          <div className="group bg-gradient-to-br from-teal-900/30 to-dark-800/80 border border-teal-800/20 rounded-2xl p-5 hover:border-teal-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/records')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <Car size={20} className="text-teal-400" />
              </div>
              <p className="text-xs font-medium text-teal-300/80 uppercase tracking-wider">{t('topBrand')}</p>
            </div>
            <p className="text-lg font-bold text-white mb-1">{topBrands[0]?.car_brand || '—'}</p>
            <p className="text-xs text-teal-400/70">{topBrands[0] ? `${topBrands[0].count} ${t('record')}` : ''}</p>
          </div>
        </div>

        {/* MALİYYƏ VƏ SİSTEM KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group bg-gradient-to-br from-red-900/30 to-dark-800/80 border border-red-800/20 rounded-2xl p-5 hover:border-red-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/expenses')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown size={20} className="text-red-400" />
              </div>
              <p className="text-xs font-medium text-red-300/80 uppercase tracking-wider">{t('todayExpense')}</p>
            </div>
            <p className="text-2xl font-bold text-red-300 mb-1">{fmt(todayExpenses?.total)}</p>
            <p className="text-xs text-red-400/70">{todayExpenses?.count || 0} {t('operations')}</p>
          </div>

          <div className="group bg-gradient-to-br from-pink-900/30 to-dark-800/80 border border-pink-800/20 rounded-2xl p-5 hover:border-pink-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/expenses')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <TrendingDown size={20} className="text-pink-400" />
              </div>
              <p className="text-xs font-medium text-pink-300/80 uppercase tracking-wider">{t('monthlyExpense')}</p>
            </div>
            <p className="text-2xl font-bold text-pink-300 mb-1">{fmt(monthExpenses?.total)}</p>
            <p className="text-xs text-pink-400/70">{t('thisMonthTotalExpense')}</p>
          </div>

          <div className={`group bg-gradient-to-br rounded-2xl p-5 transition-all duration-300 cursor-pointer border ${
            unreadNotifs > 0
              ? 'from-yellow-900/30 to-dark-800/80 border-yellow-700/40 hover:border-yellow-600/60'
              : 'from-slate-900/30 to-dark-800/80 border-dark-800/20 hover:border-dark-700/40'
          }`} onClick={() => navigate('/notifications')}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unreadNotifs > 0 ? 'bg-yellow-500/20' : 'bg-dark-700/50'}`}>
                <Bell size={20} className={unreadNotifs > 0 ? 'text-yellow-400' : 'text-dark-400'} />
              </div>
              <p className={`text-xs font-medium uppercase tracking-wider ${unreadNotifs > 0 ? 'text-yellow-300/80' : 'text-dark-400/80'}`}>{t('notifications')}</p>
            </div>
            <p className={`text-2xl font-bold mb-1 ${unreadNotifs > 0 ? 'text-yellow-300' : 'text-white'}`}>{unreadNotifs}</p>
            <p className="text-xs text-dark-500">{t('unreadNotifications')}</p>
          </div>

          <div className={`group bg-gradient-to-br rounded-2xl p-5 transition-all duration-300 cursor-pointer border ${
            licenseStatus?.expired
              ? 'from-red-900/40 to-dark-800/80 border-red-700/40 hover:border-red-600/60'
              : licenseStatus?.daysLeft <= 7
              ? 'from-amber-900/30 to-dark-800/80 border-amber-700/30 hover:border-amber-600/50'
              : 'from-emerald-900/30 to-dark-800/80 border-emerald-800/20 hover:border-emerald-700/40'
          }`} onClick={() => navigate('/license')}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                licenseStatus?.expired ? 'bg-red-500/20' : licenseStatus?.daysLeft <= 7 ? 'bg-amber-500/20' : 'bg-emerald-500/20'
              }`}>
                <Key size={20} className={licenseStatus?.expired ? 'text-red-400' : licenseStatus?.daysLeft <= 7 ? 'text-amber-400' : 'text-emerald-400'} />
              </div>
              <p className="text-xs font-medium text-dark-300/80 uppercase tracking-wider">{t('licenseStatus')}</p>
            </div>
            <p className={`text-lg font-bold mb-1 ${
              licenseStatus?.expired ? 'text-red-300' : licenseStatus?.daysLeft <= 7 ? 'text-amber-300' : 'text-emerald-300'
            }`}>
              {licenseStatus?.expired ? t('expired') : licenseStatus?.type === 'trial' ? t('trial') : 'PRO'}
            </p>
            <p className="text-xs text-dark-500">
              {licenseStatus?.expired ? t('activationRequired') : `${licenseStatus?.daysLeft || 0} ${t('daysLeft')}`}
            </p>
          </div>
        </div>

        {/* ANBAR VƏ SATIŞ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group bg-gradient-to-br from-violet-900/30 to-dark-800/80 border border-violet-800/20 rounded-2xl p-5 hover:border-violet-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/products')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Package size={20} className="text-violet-400" />
              </div>
              <p className="text-xs font-medium text-violet-300/80 uppercase tracking-wider">{t('warehouseValue')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{fmt(stockValue?.sell_value)}</p>
            <p className="text-xs text-violet-400/70">{stockValue?.total_products || 0} {t('productTypes')}</p>
          </div>

          <div className="group bg-gradient-to-br from-green-900/30 to-dark-800/80 border border-green-800/20 rounded-2xl p-5 hover:border-green-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/sales')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <ShoppingBag size={20} className="text-green-400" />
              </div>
              <p className="text-xs font-medium text-green-300/80 uppercase tracking-wider">{t('todaySales')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{fmt(todaySales?.revenue)}</p>
            <p className="text-xs text-green-400/70">{todaySales?.count || 0} {t('salesToday')}</p>
          </div>

          <div className="group bg-gradient-to-br from-rose-900/30 to-dark-800/80 border border-rose-800/20 rounded-2xl p-5 hover:border-rose-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/products')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-rose-400" />
              </div>
              <p className="text-xs font-medium text-rose-300/80 uppercase tracking-wider">{t('lowStock')}</p>
            </div>
            <p className="text-2xl font-bold text-rose-300 mb-1">{lowStockProducts.length || 0}</p>
            <p className="text-xs text-rose-400/70">{t('belowLimit')}</p>
          </div>

          <div className="group bg-gradient-to-br from-sky-900/30 to-dark-800/80 border border-sky-800/20 rounded-2xl p-5 hover:border-sky-700/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/products')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <Package size={20} className="text-sky-400" />
              </div>
              <p className="text-xs font-medium text-sky-300/80 uppercase tracking-wider">{t('totalUnits')}</p>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{stockValue?.total_units || 0}</p>
            <p className="text-xs text-sky-400/70">{t('warehouseProducts')}</p>
          </div>
        </div>

        {lowStockProducts.length > 0 && (
          <div className="card p-4 border-amber-800/30 bg-amber-950/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <AlertTriangle size={14} /> {t('lowStockWarning')} ({lowStockProducts.length})
              </h3>
              <button onClick={() => navigate('/products')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                {t('all')} <ArrowRight size={12} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/30 rounded-lg px-3 py-1.5">
                  <Package size={11} className="text-amber-500" />
                  <span className="text-xs text-amber-300 font-medium">{p.name}</span>
                  <span className="text-xs text-amber-500">{p.stock_qty}/{p.min_stock} {p.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RANDEVULAR VƏ TAPŞIRIQLAR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Yaxın Randevular */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Calendar size={18} className="text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">{t('upcomingAppointments')}</h3>
                {upcomingAppointments.length > 0 && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold">{upcomingAppointments.length}</span>}
              </div>
              <button onClick={() => navigate('/appointments')} className="text-xs px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg flex items-center gap-1.5 transition-colors">
                {t('all')} <ArrowRight size={12} />
              </button>
            </div>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-2">
                {upcomingAppointments.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-dark-700/30 hover:bg-dark-700/50 rounded-xl transition-colors">
                    <div className="text-center w-12 flex-shrink-0">
                      <p className="text-sm font-bold text-white">{a.time || '—'}</p>
                      <p className="text-[10px] text-dark-500">{a.date === new Date().toISOString().split('T')[0] ? t('today') : a.date?.slice(5)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{a.title}</p>
                      {a.customer_name && <p className="text-xs text-dark-400">{a.customer_name}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      a.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400 border-blue-700/30' : 'bg-amber-500/20 text-amber-400 border-amber-700/30'
                    }`}>{a.status === 'confirmed' ? t('confirmed') : t('waiting')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar size={24} className="mx-auto mb-2 text-dark-600" />
                <p className="text-xs text-dark-500">{t('noUpcomingAppointments')}</p>
              </div>
            )}
          </div>

          {/* Aktiv Tapşırıqlar */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <CheckCircle size={18} className="text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">{t('activeTasks')}</h3>
                {taskStats && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">{(taskStats.todo || 0) + (taskStats.in_progress || 0)}</span>}
              </div>
              <button onClick={() => navigate('/tasks')} className="text-xs px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg flex items-center gap-1.5 transition-colors">
                {t('all')} <ArrowRight size={12} />
              </button>
            </div>
            {taskStats && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-dark-700/30 rounded-lg">
                  <p className="text-lg font-bold text-white">{taskStats.todo || 0}</p>
                  <p className="text-[10px] text-dark-500">{t('waiting')}</p>
                </div>
                <div className="text-center p-2 bg-amber-900/20 rounded-lg border border-amber-800/20">
                  <p className="text-lg font-bold text-amber-400">{taskStats.in_progress || 0}</p>
                  <p className="text-[10px] text-dark-500">{t('continuing')}</p>
                </div>
                <div className="text-center p-2 bg-emerald-900/20 rounded-lg border border-emerald-800/20">
                  <p className="text-lg font-bold text-emerald-400">{taskStats.done || 0}</p>
                  <p className="text-[10px] text-dark-500">{t('done')}</p>
                </div>
              </div>
            )}
            {activeTasks.length > 0 ? (
              <div className="space-y-2">
                {activeTasks.slice(0, 5).map(tk => {
                  const isOverdue = tk.due_date && tk.due_date < new Date().toISOString().split('T')[0];
                  return (
                    <div key={tk.id} className="flex items-center gap-3 p-3 bg-dark-700/30 hover:bg-dark-700/50 rounded-xl transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        tk.priority === 'high' ? 'bg-red-400' : tk.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{tk.title}</p>
                        {tk.due_date && <p className={`text-[10px] ${isOverdue ? 'text-red-400' : 'text-dark-500'}`}>{isOverdue ? '⚠ ' : ''}{tk.due_date}</p>}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        tk.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border-amber-700/30' : 'bg-dark-600 text-dark-300 border-dark-500'
                      }`}>{tk.status === 'in_progress' ? t('continuing') : t('waiting')}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle size={24} className="mx-auto mb-2 text-dark-600" />
                <p className="text-xs text-dark-500">{t('noActiveTasks')}</p>
              </div>
            )}
          </div>
        </div>

        {/* QRAFIKLƏR VƏ CƏDVƏLLƏR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aylıq Gəlir Qrafiki */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp size={18} className="text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">{t('monthlyRevenueChart')}</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg">{new Date().getFullYear()}</span>
            </div>
            {monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}${csym}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#1e3a8a" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state h-[220px] justify-center">
                <p className="text-dark-500 text-sm">Məlumat yoxdur</p>
              </div>
            )}
          </div>

          {/* Ən Çox Xidmətlər Cədvəli */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Star size={18} className="text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('topServices')}</h3>
            </div>
            {topServices.length > 0 ? (
              <div className="space-y-3">
                {topServices.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-dark-700/30 hover:bg-dark-700/50 rounded-xl transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/30 to-orange-600/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{s.service_type}</p>
                      <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" style={{ width: `${(s.count / (topServices[0]?.count || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-white font-bold">{s.count}</p>
                      <p className="text-xs text-dark-400">{t('times')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500 text-sm">{t('noData')}</p>
            )}
          </div>
        </div>

        {/* Brands and Debt */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ən Çox Markalar */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Car size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('topBrands')}</h3>
            </div>
            {topBrands.length > 0 ? (
              <div className="space-y-3">
                {topBrands.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-dark-700/30 hover:bg-dark-700/50 rounded-xl transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{b.car_brand}</p>
                      <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${(b.count / (topBrands[0]?.count || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-white font-bold">{b.count}</p>
                      <p className="text-xs text-dark-400">{t('record')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500 text-sm">{t('noData')}</p>
            )}
          </div>

          {/* Debt Statistics */}
          <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <CreditCard size={18} className="text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('paymentStatus')}</h3>
            </div>
            {debtStats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl hover:border-emerald-600/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-sm text-emerald-200 font-medium">{t('paid')}</span>
                  </div>
                  <span className="text-lg text-emerald-100 font-bold">{fmt(debtStats.paid)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-900/30 to-amber-900/10 border border-amber-700/30 rounded-xl hover:border-amber-600/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Clock size={16} className="text-amber-400" />
                    </div>
                    <span className="text-sm text-amber-200 font-medium">{t('waiting')}</span>
                  </div>
                  <span className="text-lg text-amber-100 font-bold">{fmt(debtStats.pending)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-900/30 to-red-900/10 border border-red-700/30 rounded-xl hover:border-red-600/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <span className="text-sm text-red-200 font-medium">{t('debt')}</span>
                  </div>
                  <span className="text-lg text-red-100 font-bold">{fmt(debtStats.debt)}</span>
                </div>
              </div>
            ) : (
              <p className="text-dark-500 text-sm">{t('noData')}</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 border border-dark-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-dark-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Clock size={18} className="text-primary-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('recentRecords')}</h3>
            </div>
            <button onClick={() => navigate('/records')} className="text-xs px-3 py-1.5 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 rounded-lg flex items-center gap-1.5 transition-colors">
              {t('all')} <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('asset')}</th>
                  <th>{t('customer')}</th>
                  <th>{t('service')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-dark-500 py-8">{t('noData')}</td></tr>
                ) : recentRecords.map(r => (
                  <tr key={r.id}>
                    <td className="text-dark-300">{r.date}</td>
                    <td className="font-medium text-white">{[r.car_brand, r.car_model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="text-dark-300">{r.customer_name || '—'}</td>
                    <td className="text-dark-300">{r.service_type || '—'}</td>
                    <td className="font-semibold text-emerald-400">{fmt(r.total_price)}</td>
                    <td>
                      <span className={PAYMENT_STATUS_MAP[r.payment_status]?.cls || 'status-badge bg-dark-700 text-dark-400'}>
                        {PAYMENT_STATUS_MAP[r.payment_status]?.label || r.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
