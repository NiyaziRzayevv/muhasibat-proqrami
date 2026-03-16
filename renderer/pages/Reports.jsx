import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, RefreshCw, Calendar, TrendingUp, Package, ShoppingCart, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';
import { apiRequest } from '../api/http';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(2)} ₼`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-dark-300 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === 'number' && p.name !== 'Qeyd sayı' ? fmt(p.value) : p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const userId = isAdmin ? null : currentUser?.id;
  const [tab, setTab] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topBrands, setTopBrands] = useState([]);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthStats, setMonthStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [stockValue, setStockValue] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chart, svcs, brands, ms, tp, sv, ls, sc] = await Promise.all([
        apiBridge.getMonthlyChart(year, userId),
        apiBridge.getTopServices(10, userId),
        apiBridge.getTopBrands(10, userId),
        apiBridge.getMonthStats(year, month, userId),
        apiBridge.getTopSellingProducts(10, userId),
        apiBridge.getStockValue(userId),
        apiBridge.getLowStockProducts(userId),
        apiBridge.getMonthlySalesChart(year, userId),
      ]);

      if (chart.success) {
        const data = chart.data.map(d => ({
          name: AZ_MONTHS[parseInt(d.month) - 1].slice(0, 3),
          fullName: AZ_MONTHS[parseInt(d.month) - 1],
          total: d.total,
          count: d.count,
        }));
        const allMonths = AZ_MONTHS.map((m, i) => {
          const found = data.find(d => d.fullName === m);
          return found || { name: m.slice(0, 3), fullName: m, total: 0, count: 0 };
        });
        setMonthlyData(allMonths);
      }
      if (svcs.success) setTopServices(svcs.data);
      if (brands.success) setTopBrands(brands.data);
      if (ms.success) setMonthStats(ms.data);
      if (tp.success) setTopProducts(tp.data);
      if (sv.success) setStockValue(sv.data);
      if (ls.success) setLowStock(ls.data);
      if (sc.success) {
        const allMonths = AZ_MONTHS.map((m, i) => {
          const found = sc.data.find(d => parseInt(d.month) === i + 1);
          return { name: m.slice(0, 3), total: found?.total || 0, count: found?.count || 0 };
        });
        setMonthlySales(allMonths);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month, userId]);

  const loadDailyRecords = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await apiBridge.getRecords({ startDate: today, endDate: today, orderBy: 'time', orderDir: 'asc', userId });
    if (res.success) setDailyRecords(res.data);
  }, [userId]);

  const loadMonthlyRecords = useCallback(async () => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-31`;
    const res = await apiBridge.getRecords({ startDate: start, endDate: end, orderBy: 'date', orderDir: 'asc', userId });
    if (res.success) setMonthlyRecords(res.data);
  }, [year, month, userId]);

  useEffect(() => { loadData(); loadDailyRecords(); loadMonthlyRecords(); }, [loadData, loadDailyRecords, loadMonthlyRecords]);

  async function handleExportDailyPdf() {
    try {
      let companyName = 'SmartQeyd';
      try {
        if (window.api?.getSettings) {
          const settings = await window.api.getSettings();
          companyName = settings.data?.company_name || companyName;
        } else {
          const s = await apiRequest('/settings', { token: getToken() });
          companyName = s?.data?.company_name || companyName;
        }
      } catch {}
      const today = new Date().toISOString().split('T')[0];

      if (window.api?.exportDailyPdf) {
        const res = await window.api.exportDailyPdf(dailyRecords, today, { companyName });
        if (res.success) {
          showNotification('Gündəlik hesabat PDF hazır oldu', 'success');
          window.api.showItemInFolder(res.path);
        }
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(12);
      doc.text(`${companyName} — Gündəlik Hesabat (${today})`, 14, 12);
      autoTable(doc, {
        startY: 18,
        head: [['Tarix', 'Aktiv', 'Müştəri', 'Xidmət', 'Məbləğ', 'Status']],
        body: (dailyRecords || []).map(r => ([
          r.date,
          [r.car_brand, r.car_model].filter(Boolean).join(' ') || '—',
          r.customer_name || '—',
          r.service_type || '—',
          String(r.total_price ?? ''),
          r.payment_status || '',
        ])),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 58, 138] },
      });
      doc.save(`gunluk-hesabat-${today}.pdf`);
      showNotification('Gündəlik hesabat PDF hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  async function handleExportMonthlyExcel() {
    try {
      if (window.api?.exportExcel) {
        const res = await window.api.exportExcel(monthlyRecords, `hesabat-${year}-${String(month).padStart(2, '0')}.xlsx`);
        if (res.success) {
          showNotification('Aylıq hesabat Excel hazır oldu', 'success');
          window.api.showItemInFolder(res.path);
        }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(monthlyRecords);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hesabat');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hesabat-${year}-${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification('Aylıq hesabat Excel hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  const totalYearly = monthlyData.reduce((s, d) => s + d.total, 0);
  const totalYearlyCount = monthlyData.reduce((s, d) => s + d.count, 0);

  const TABS = [
    { key: 'monthly', label: 'Aylıq Hesabat' },
    { key: 'services', label: 'Xidmət Üzrə' },
    { key: 'brands', label: 'Marka Üzrə' },
    { key: 'inventory', label: 'Anbar Hesabatı' },
    { key: 'daily', label: 'Gündəlik' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hesabatlar</h1>
          <p className="text-sm text-dark-400 mt-0.5">Analitika və statistika</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadData(); loadDailyRecords(); loadMonthlyRecords(); }} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-dark-800 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {tab === 'monthly' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <label className="label mb-0">İl:</label>
                <select className="select-field w-24 h-8 text-xs" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                  {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="label mb-0">Ay:</label>
                <select className="select-field w-32 h-8 text-xs" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                  {AZ_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <button onClick={handleExportMonthlyExcel} className="btn-secondary text-xs py-1.5">
                <Download size={13} /> Excel
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{fmt(monthStats?.revenue)}</p>
                <p className="text-xs text-dark-400 mt-1">Bu ayın gəliri ({AZ_MONTHS[month - 1]})</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-400">{monthStats?.count || 0}</p>
                <p className="text-xs text-dark-400 mt-1">Bu ayın qeydləri</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{fmt(monthStats?.total)}</p>
                <p className="text-xs text-dark-400 mt-1">Ümumi faktura</p>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={14} className="text-primary-400" />
                  {year} il aylıq gəlir · Cəm: <span className="text-emerald-400">{fmt(totalYearly)}</span>
                  <span className="text-dark-500 font-normal">({totalYearlyCount} qeyd)</span>
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}₼`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                  <Bar dataKey="total" name="Gəlir" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === month - 1 ? '#3b82f6' : '#1e3a8a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{AZ_MONTHS[month - 1]} {year} — Qeydlər</h3>
                <span className="text-xs text-dark-400">{monthlyRecords.length} qeyd</span>
              </div>
              <div className="overflow-auto max-h-64">
                <table className="data-table text-xs">
                  <thead><tr><th>Tarix</th><th>Aktiv</th><th>Müştəri</th><th>Xidmət</th><th>Məbləğ</th><th>Status</th></tr></thead>
                  <tbody>
                    {monthlyRecords.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-dark-500 py-8">Bu ayda qeyd yoxdur</td></tr>
                    ) : monthlyRecords.map(r => (
                      <tr key={r.id}>
                        <td className="font-mono text-dark-400">{r.date}</td>
                        <td>{[r.car_brand, r.car_model].filter(Boolean).join(' ') || '—'}</td>
                        <td className="text-dark-300">{r.customer_name || '—'}</td>
                        <td className="max-w-[150px] truncate">{r.service_type || '—'}</td>
                        <td className="text-emerald-400 font-semibold">{fmt(r.total_price)}</td>
                        <td><span className={`status-${r.payment_status} status-badge`}>{r.payment_status === 'odenilib' ? 'Ödənilib' : r.payment_status === 'gozleyir' ? 'Gözləyir' : r.payment_status === 'qismen' ? 'Qismən' : 'Borc'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'services' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Xidmət Sayı üzrə</h3>
              {topServices.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topServices.map(s => ({ name: s.service_type?.split(' ').slice(0, 2).join(' '), count: s.count, total: s.total }))} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                    <Bar dataKey="count" name="Qeyd sayı" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-dark-500 text-sm text-center py-10">Məlumat yoxdur</p>}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Gəlir üzrə paylanma</h3>
              {topServices.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={topServices.map(s => ({ name: s.service_type?.split(' ').slice(0, 2).join(' '), value: s.total || 0 }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value">
                      {topServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend formatter={(v) => <span className="text-xs text-dark-300">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-dark-500 text-sm text-center py-10">Məlumat yoxdur</p>}
            </div>

            <div className="col-span-2 card overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-700">
                <h3 className="text-sm font-semibold text-white">Xidmət Statistikası</h3>
              </div>
              <table className="data-table">
                <thead><tr><th>#</th><th>Xidmət növü</th><th>Qeyd sayı</th><th>Ümumi gəlir</th><th>Ortalama</th></tr></thead>
                <tbody>
                  {topServices.map((s, i) => (
                    <tr key={i}>
                      <td className="text-dark-500">{i + 1}</td>
                      <td className="font-medium text-white">{s.service_type}</td>
                      <td className="text-dark-300">{s.count}</td>
                      <td className="text-emerald-400 font-semibold">{fmt(s.total)}</td>
                      <td className="text-dark-300">{s.count > 0 ? fmt((s.total || 0) / s.count) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'brands' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Marka üzrə Qeyd Sayı</h3>
              {topBrands.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topBrands.map(b => ({ name: b.car_brand, count: b.count, total: b.total }))} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                    <Bar dataKey="count" name="Qeyd sayı" radius={[0, 4, 4, 0]}>
                      {topBrands.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-dark-500 text-sm text-center py-10">Məlumat yoxdur</p>}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Marka üzrə Gəlir</h3>
              {topBrands.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={topBrands.map(b => ({ name: b.car_brand, value: b.total || 0 }))}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value">
                      {topBrands.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend formatter={v => <span className="text-xs text-dark-300">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-dark-500 text-sm text-center py-10">Məlumat yoxdur</p>}
            </div>

            <div className="col-span-2 card overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-700">
                <h3 className="text-sm font-semibold text-white">Marka Statistikası</h3>
              </div>
              <table className="data-table">
                <thead><tr><th>#</th><th>Marka</th><th>Qeyd sayı</th><th>Ümumi gəlir</th><th>Ortalama</th></tr></thead>
                <tbody>
                  {topBrands.map((b, i) => (
                    <tr key={i}>
                      <td className="text-dark-500">{i + 1}</td>
                      <td className="font-medium text-white">{b.car_brand}</td>
                      <td className="text-dark-300">{b.count}</td>
                      <td className="text-emerald-400 font-semibold">{fmt(b.total)}</td>
                      <td className="text-dark-300">{b.count > 0 ? fmt((b.total || 0) / b.count) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-white">{stockValue?.total_products || 0}</p>
                <p className="text-xs text-dark-400 mt-1">Məhsul növü</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{fmt(stockValue?.sell_value)}</p>
                <p className="text-xs text-dark-400 mt-1">Satış dəyəri</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-400">{fmt(stockValue?.buy_value)}</p>
                <p className="text-xs text-dark-400 mt-1">Alış dəyəri</p>
              </div>
              <div className="card p-4 text-center">
                <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {lowStock.length}
                </p>
                <p className="text-xs text-dark-400 mt-1">Azalan stok</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <ShoppingCart size={14} className="text-primary-400" />
                  Aylıq Satış ({year})
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlySales} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}₼`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                    <Bar dataKey="total" name="Satış" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Package size={14} className="text-amber-400" />
                  Ən Çox Satılan Məhsullar
                </h3>
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topProducts.slice(0, 8).map(p => ({ name: p.product_name?.split(' ').slice(0, 2).join(' ') || '—', qty: p.total_qty, revenue: p.total_revenue }))} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="qty" name="Miqdar" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-dark-500 text-sm">Satış yoxdur</div>
                )}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package size={14} className="text-primary-400" /> Ən Çox Satılan Məhsullar — Cədvəl
                </h3>
                <span className="text-xs text-dark-400">{topProducts.length} məhsul</span>
              </div>
              <div className="overflow-auto max-h-60">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Məhsul</th><th>Satış miqdarı</th><th>Ümumi gəlir</th><th>Mövcud stok</th></tr></thead>
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-dark-500 py-8">Məlumat yoxdur</td></tr>
                    ) : topProducts.map((p, i) => (
                      <tr key={i}>
                        <td className="text-dark-500">{i + 1}</td>
                        <td className="font-medium text-white">{p.product_name}</td>
                        <td className="text-dark-300">{p.total_qty} {p.unit || ''}</td>
                        <td className="text-emerald-400 font-semibold">{fmt(p.total_revenue)}</td>
                        <td className={p.stock_qty <= 0 ? 'text-red-400 font-semibold' : 'text-dark-300'}>
                          {p.stock_qty ?? '—'} {p.unit || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {lowStock.length > 0 && (
              <div className="card overflow-hidden border-amber-800/30">
                <div className="px-4 py-3 border-b border-amber-800/30 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-400">Azalan Stok ({lowStock.length})</h3>
                </div>
                <table className="data-table">
                  <thead><tr><th>Məhsul</th><th>Kateqoriya</th><th>Mövcud stok</th><th>Min limit</th></tr></thead>
                  <tbody>
                    {lowStock.map((p, i) => (
                      <tr key={i}>
                        <td className="font-medium text-white">{p.name}</td>
                        <td className="text-dark-400">{p.category_name || '—'}</td>
                        <td className="text-amber-400 font-semibold">{p.stock_qty} {p.unit}</td>
                        <td className="text-dark-500">{p.min_stock} {p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'daily' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-dark-300">
                <Calendar size={14} className="text-primary-400" />
                Bugün: {new Date().toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <button onClick={handleExportDailyPdf} className="btn-secondary text-xs py-1.5">
                <Download size={13} /> PDF Hesabat
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-primary-400">{dailyRecords.length}</p>
                <p className="text-xs text-dark-400 mt-1">Bu günkü qeyd sayı</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{fmt(dailyRecords.reduce((s, r) => s + (r.total_price || 0), 0))}</p>
                <p className="text-xs text-dark-400 mt-1">Bu günkü ümumi</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{fmt(dailyRecords.reduce((s, r) => s + (r.paid_amount || 0), 0))}</p>
                <p className="text-xs text-dark-400 mt-1">Bu gün ödənilən</p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <table className="data-table">
                <thead><tr><th>Saat</th><th>Aktiv</th><th>Müştəri</th><th>Xidmət</th><th>Məbləğ</th><th>Status</th></tr></thead>
                <tbody>
                  {dailyRecords.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-dark-500 py-10">Bu gün üçün qeyd yoxdur</td></tr>
                  ) : dailyRecords.map(r => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs text-dark-400">{r.time || '—'}</td>
                      <td className="font-medium text-white">{[r.car_brand, r.car_model].filter(Boolean).join(' ') || '—'}</td>
                      <td className="text-dark-300">{r.customer_name || '—'}</td>
                      <td className="text-dark-200">{r.service_type || '—'}</td>
                      <td className="text-emerald-400 font-semibold">{fmt(r.total_price)}</td>
                      <td><span className={`status-${r.payment_status} status-badge`}>{r.payment_status === 'odenilib' ? 'Ödənilib' : r.payment_status === 'gozleyir' ? 'Gözləyir' : r.payment_status === 'qismen' ? 'Qismən' : 'Borc'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
