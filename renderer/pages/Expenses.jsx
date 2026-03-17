import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, Edit3, Trash2, Search, Filter,
  TrendingDown, Calendar, X, CheckCircle, PieChart as PieChartIcon, FileSpreadsheet, BarChart2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { getCurrencySymbol } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

const CHART_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function getPayMethods(t) { return { cash: t('cash'), card: t('card'), transfer: t('transfer') }; }
const CATEGORY_COLORS = {
  'İcarə': 'bg-purple-500/20 text-purple-400',
  'Maaş': 'bg-blue-500/20 text-blue-400',
  'Material': 'bg-amber-500/20 text-amber-400',
  'Nəqliyyat': 'bg-cyan-500/20 text-cyan-400',
  'Reklam': 'bg-pink-500/20 text-pink-400',
  'Kommunal': 'bg-orange-500/20 text-orange-400',
  'Texnika': 'bg-indigo-500/20 text-indigo-400',
  'Sığorta': 'bg-teal-500/20 text-teal-400',
  'Vergi': 'bg-red-500/20 text-red-400',
  'Digər': 'bg-dark-500/20 text-dark-400',
};

function fmt(n) { return Number(n || 0).toFixed(2); }

const EMPTY = { date: '', category: 'Digər', description: '', amount: '', payment_method: 'cash', notes: '' };

export default function Expenses() {
  const { showNotification, currentUser, isAdmin, currency } = useApp();
  const { t } = useLanguage();
  const csym = getCurrencySymbol(currency);
  const PAY_METHODS = getPayMethods(t);
  const userId = isAdmin ? null : currentUser?.id;
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showChart, setShowChart] = useState(true);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  useEffect(() => { loadAll(); }, [userId]);

  async function loadAll() {
    setLoading(true);
    try {
      const filters = {};
      if (filterStart) filters.startDate = filterStart;
      if (filterEnd) filters.endDate = filterEnd;
      if (filterCat) filters.category = filterCat;
      if (search) filters.search = search;

      if (userId) filters.userId = userId;
      const [expRes, statsRes, catRes] = await Promise.all([
        window.api?.getExpenses
          ? window.api.getExpenses(filters)
          : apiRequest(`/expenses?${new URLSearchParams(filters).toString()}`, { token: getToken() }),
        window.api?.getExpenseStats
          ? window.api.getExpenseStats(filterStart || null, filterEnd || null, userId)
          : apiRequest(`/stats/expenses?${new URLSearchParams({
            ...(filterStart ? { startDate: filterStart } : {}),
            ...(filterEnd ? { endDate: filterEnd } : {}),
            ...(userId ? { userId } : {}),
          }).toString()}`, { token: getToken() }),
        window.api?.getExpenseCategories
          ? window.api.getExpenseCategories()
          : apiRequest(`/expenses/categories?${new URLSearchParams({ ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() }),
      ]);
      if (expRes.success) setExpenses(expRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
      if (catRes.success) setCategories(catRes.data || []);
    } catch (e) {
      showNotification('Yükləmə xətası: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [search, filterCat, filterStart, filterEnd, userId]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] });
    setModal(true);
  }

  function openEdit(exp) {
    setEditing(exp);
    setForm({ date: exp.date, category: exp.category, description: exp.description || '', amount: exp.amount, payment_method: exp.payment_method || 'cash', notes: exp.notes || '' });
    setModal(true);
  }

  async function handleSave() {
    if (!form.date || !form.category || !form.amount) {
      showNotification('Tarix, kateqoriya və məbləğ mütləqdir', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, amount: parseFloat(form.amount) || 0 };
      if (!editing) data.user_id = currentUser?.id;
      const res = editing
        ? (window.api?.updateExpense
          ? await window.api.updateExpense(editing.id, data)
          : await apiRequest(`/expenses/${editing.id}`, { method: 'PUT', token: getToken(), body: data }))
        : (window.api?.createExpense
          ? await window.api.createExpense(data)
          : await apiRequest('/expenses', { method: 'POST', token: getToken(), body: data }));
      if (res.success) {
        showNotification(editing ? 'Yeniləndi' : 'Xərc əlavə edildi', 'success');
        setModal(false);
        await loadAll();
      } else {
        showNotification(res.error || 'Xəta', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu xərci silmək istəyirsiniz?')) return;
    const res = window.api?.deleteExpense
      ? await window.api.deleteExpense(id)
      : await apiRequest(`/expenses/${id}`, { method: 'DELETE', token: getToken() });
    if (res.success) { showNotification('Silindi', 'success'); await loadAll(); }
    else showNotification(res.error || 'Xəta', 'error');
  }

  async function handleExportExcel() {
    try {
      const rows = expenses.map(e => ({
        tarix: e.date, kateqoriya: e.category, aciklama: e.description,
        odenis_novu: PAY_METHODS[e.payment_method] || e.payment_method, mebleq: e.amount
      }));

      if (window.api?.exportExcel) {
        const result = await window.api.exportExcel(rows, `xercler-${new Date().toISOString().split('T')[0]}.xlsx`);
        if (result.success) {
          showNotification('Excel hazır oldu', 'success');
          window.api.showItemInFolder(result.path);
        }
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Xərclər');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xercler-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification('Excel hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  const totalExpenses = stats?.total || 0;
  const chartData = stats?.byCategory?.map((c, i) => ({ name: c.category, value: c.total, color: CHART_COLORS[i % CHART_COLORS.length] })) || [];

  // Build last-7-days trend from expenses
  const trendData = (() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: `${d.getDate()}/${d.getMonth() + 1}`, amount: 0 };
    }
    expenses.forEach(e => { const d = (e.date || '').split('T')[0]; if (days[d]) days[d].amount += e.amount || 0; });
    return Object.values(days);
  })();

  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const maxExpense = expenses.reduce((m, e) => Math.max(m, e.amount || 0), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center">
            <TrendingDown size={18} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Xərclər</h1>
            <p className="text-dark-400 text-xs">Biznes xərclərini izlə</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white font-medium py-2 px-3 rounded-xl transition-colors text-sm">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => setShowChart(!showChart)} className={`flex items-center gap-2 bg-dark-800 hover:bg-dark-700 font-medium py-2 px-3 rounded-xl transition-colors text-sm ${showChart ? 'text-primary-400 border border-primary-500' : 'text-dark-400 hover:text-white'}`}>
            <PieChartIcon size={14} /> Qrafik
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm">
            <Plus size={16} /> Xərc əlavə et
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 pt-4 pb-2 flex-shrink-0">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-dark-900 border border-red-800/30 bg-red-900/10 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Ümumi Xərc</p>
            <p className="text-2xl font-black text-red-400">{fmt(totalExpenses)}</p>
            <p className="text-[10px] text-dark-500 mt-0.5">{csym} məcmu</p>
          </div>
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Ǝməliyyat</p>
            <p className="text-2xl font-black text-white">{expenses.length}</p>
            <p className="text-[10px] text-dark-500 mt-0.5">qeydiyyat</p>
          </div>
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Ort. Xərc</p>
            <p className="text-2xl font-black text-amber-400">{fmt(avgExpense)}</p>
            <p className="text-[10px] text-dark-500 mt-0.5">{csym} orta</p>
          </div>
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <p className="text-xs text-dark-400 mb-1">Maks. Xərc</p>
            <p className="text-2xl font-black text-purple-400">{fmt(maxExpense)}</p>
            <p className="text-[10px] text-dark-500 mt-0.5">{csym} maksimum</p>
          </div>
        </div>
      </div>

      {/* Stats Row + Charts */}
      {stats && showChart && (
        <div className="px-6 pb-4 border-b border-dark-800 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            {/* Pie Chart */}
            {chartData.length > 0 && (
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
                <p className="text-xs text-dark-400 mb-2 font-semibold uppercase">Kateqoriya üzrə bölgü</p>
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${Number(v).toFixed(2)} ${csym}`} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1">
                    {chartData.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="text-xs text-dark-400 truncate max-w-[100px]">{c.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-white">{fmt(c.value)} {csym}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Trend Bar Chart */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
              <p className="text-xs text-dark-400 mb-2 font-semibold uppercase">Son 7 Gün Trendi</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [`${Number(v).toFixed(2)} ${csym}`, 'Xərc']} />
                  <Bar dataKey="amount" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 border-b border-dark-800 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
            placeholder="Axtar..."
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="">Bütün kateqoriyalar</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500" />
        {(filterCat || filterStart || filterEnd || search) && (
          <button onClick={() => { setFilterCat(''); setFilterStart(''); setFilterEnd(''); setSearch(''); }}
            className="text-dark-400 hover:text-white transition-colors"><X size={16} /></button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <DollarSign size={48} className="mb-3 opacity-30" />
            <p>Xərc tapılmadı</p>
            <button onClick={openAdd} className="mt-3 text-primary-400 hover:text-primary-300 text-sm">+ İlk xərci əlavə et</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-dark-900 border-b border-dark-800">
              <tr className="text-left text-xs text-dark-400 font-semibold">
                <th className="px-6 py-3">Tarix</th>
                <th className="px-4 py-3">Kateqoriya</th>
                <th className="px-4 py-3">Açıqlama</th>
                <th className="px-4 py-3">Ödəniş növü</th>
                <th className="px-4 py-3 text-right">Məbləğ</th>
                <th className="px-4 py-3 text-center">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-dark-900/50 transition-colors">
                  <td className="px-6 py-3 text-sm text-white">{exp.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Digər']}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-300 max-w-xs truncate">{exp.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-dark-400">{PAY_METHODS[exp.payment_method] || exp.payment_method}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-400">{fmt(exp.amount)} {csym}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(exp)} className="p-1.5 hover:bg-dark-700 text-dark-400 hover:text-white rounded-lg transition-colors">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 hover:bg-red-900/30 text-dark-400 hover:text-red-400 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">{editing ? 'Xərci düzəlt' : 'Yeni xərc'}</h2>
              <button onClick={() => setModal(false)} className="text-dark-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Tarix *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Kateqoriya *</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Açıqlama</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                  placeholder="Xərcin açıqlaması..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Məbləğ ({csym}) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="0.00" min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Ödəniş növü</label>
                  <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500">
                    <option value="cash">Nağd</option>
                    <option value="card">Kart</option>
                    <option value="transfer">Köçürmə</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Qeyd</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                  rows={2} placeholder="Əlavə qeyd..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)}
                className="flex-1 bg-dark-800 hover:bg-dark-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
                İmtina
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {editing ? 'Yenilə' : 'Əlavə et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
