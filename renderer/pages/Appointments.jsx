import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Plus, Trash2, Edit3, CheckCircle, X, Search,
  User, Phone, AlarmClock, ChevronLeft, ChevronRight, Filter, Loader2, Save
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';

function getStatus(t) {
  return {
    pending:   { label: t('waiting'),    cls: 'bg-amber-500/20 text-amber-400 border-amber-700/30' },
    confirmed: { label: t('confirmed'), cls: 'bg-blue-500/20 text-blue-400 border-blue-700/30' },
    completed: { label: t('completed'),  cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-700/30' },
    cancelled: { label: t('cancelled'), cls: 'bg-red-500/20 text-red-400 border-red-700/30' },
  };
}

const EMPTY = { title: '', customer_name: '', phone: '', date: new Date().toISOString().split('T')[0], time: '09:00', duration: 60, notes: '', status: 'pending' };

export default function Appointments() {
  const { showNotification } = useApp();
  const { t } = useLanguage();
  const STATUS = getStatus(t);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      const res = await apiBridge.getAppointments({});
      if (res.success) setAppointments(res.data || []);
    } catch (e) { console.error('Appointments load error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({ title: a.title, customer_name: a.customer_name || '', phone: a.phone || '', date: a.date, time: a.time || '09:00', duration: a.duration || 60, notes: a.notes || '', status: a.status || 'pending' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { showNotification('Başlıq daxil edin', 'error'); return; }
    if (!form.date) { showNotification('Tarix seçin', 'error'); return; }
    try {
      if (editing) {
        const res = await apiBridge.updateAppointment(editing.id, form);
        if (res.success) { showNotification('Yeniləndi', 'success'); }
        else { showNotification(res.error || 'Xəta', 'error'); }
      } else {
        const res = await apiBridge.createAppointment(form);
        if (res.success) { showNotification('Randevu əlavə edildi', 'success'); }
        else { showNotification(res.error || 'Xəta', 'error'); }
      }
      setModalOpen(false);
      await loadData();
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  async function handleDelete() {
    try {
      await apiBridge.deleteAppointment(deleteId);
      setDeleteId(null);
      showNotification('Silindi', 'success');
      await loadData();
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  async function changeStatus(id, status) {
    try {
      await apiBridge.updateAppointment(id, { status });
      await loadData();
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  }

  const filtered = appointments.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterDate && a.date !== filterDate) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) &&
        !a.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const todayAppts = appointments.filter(a => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = appointments.filter(a => a.date > today && a.status !== 'cancelled').length;
  const todayCount = todayAppts.length;
  const completedToday = todayAppts.filter(a => a.status === 'completed').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar size={22} className="text-primary-400" /> Randevular
          </h1>
          <p className="text-sm text-dark-400 mt-0.5">
            Bugün: <span className="text-white font-semibold">{todayCount}</span> randevu
            · Gözləyən: <span className="text-amber-400 font-semibold">{upcoming}</span>
            · Tamamlanan: <span className="text-emerald-400 font-semibold">{completedToday}</span>
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm py-2">
          <Plus size={15} /> Yeni Randevu
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {Object.entries(STATUS).map(([key, s]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`card p-4 text-left transition-all border ${filterStatus === key ? s.cls : 'border-dark-700'}`}>
            <p className="text-xs text-dark-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {appointments.filter(a => a.status === key).length}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-8 h-8 text-xs" placeholder="Axtar..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="input-field h-8 text-xs w-36" />
        <div className="flex bg-dark-800 rounded-xl p-1 gap-1">
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
            Siyahı
          </button>
          <button onClick={() => setViewMode('today')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${viewMode === 'today' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
            Bugün
          </button>
        </div>
        {(search || filterStatus || filterDate) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterDate(''); }}
            className="text-dark-400 hover:text-white"><X size={14} /></button>
        )}
      </div>

      {/* Today View */}
      {viewMode === 'today' && (
        <div className="space-y-3">
          {todayAppts.length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar size={36} className="mx-auto mb-3 text-dark-600" />
              <p className="text-dark-400">Bu gün üçün randevu yoxdur</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {todayAppts.map(a => (
                <div key={a.id} className={`card p-4 border ${STATUS[a.status]?.cls || ''} flex items-center gap-4`}>
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-lg font-black text-white">{a.time}</p>
                    {a.duration && <p className="text-[10px] text-dark-400">{a.duration} dəq</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{a.title}</p>
                    {a.customer_name && <p className="text-xs text-dark-400 flex items-center gap-1 mt-0.5"><User size={10} />{a.customer_name}</p>}
                    {a.phone && <p className="text-xs text-dark-400 flex items-center gap-1"><Phone size={10} />{a.phone}</p>}
                    {a.notes && <p className="text-xs text-dark-500 mt-1 truncate">{a.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS[a.status]?.cls}`}>
                      {STATUS[a.status]?.label}
                    </span>
                    <div className="flex gap-1">
                      {a.status !== 'completed' && (
                        <button onClick={() => changeStatus(a.id, 'completed')}
                          className="p-1.5 bg-emerald-900/30 text-emerald-400 rounded-lg hover:bg-emerald-900/50 transition-colors" title="Tamamla">
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button onClick={() => openEdit(a)} className="btn-icon w-7 h-7"><Edit3 size={12} /></button>
                      <button onClick={() => setDeleteId(a.id)} className="btn-icon w-7 h-7 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarix / Saat</th>
                <th>Başlıq</th>
                <th>Müştəri</th>
                <th>Müddət</th>
                <th>Status</th>
                <th>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <div className="empty-state">
                    <Calendar size={32} className="text-dark-600 mb-2" />
                    <p className="text-dark-400">Randevu tapılmadı</p>
                  </div>
                </td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className={a.date === today ? 'bg-primary-500/5' : ''}>
                  <td>
                    <p className="font-mono text-xs text-white">{a.date}</p>
                    <p className="text-xs text-primary-400 flex items-center gap-1 mt-0.5">
                      <Clock size={9} />{a.time}
                    </p>
                    {a.date === today && <span className="text-[9px] bg-primary-500/20 text-primary-400 px-1.5 rounded-full">Bugün</span>}
                  </td>
                  <td>
                    <p className="font-medium text-white">{a.title}</p>
                    {a.notes && <p className="text-xs text-dark-500 truncate max-w-[200px]">{a.notes}</p>}
                  </td>
                  <td>
                    {a.customer_name ? (
                      <div>
                        <p className="text-dark-200">{a.customer_name}</p>
                        {a.phone && <p className="text-xs text-dark-400">{a.phone}</p>}
                      </div>
                    ) : <span className="text-dark-600">—</span>}
                  </td>
                  <td className="text-dark-400">{a.duration ? `${a.duration} dəq` : '—'}</td>
                  <td>
                    <select value={a.status} onChange={e => changeStatus(a.id, e.target.value)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border bg-transparent cursor-pointer ${STATUS[a.status]?.cls}`}>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <option key={k} value={k} className="bg-dark-800 text-white">{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a)} className="btn-icon w-7 h-7"><Edit3 size={12} /></button>
                      <button onClick={() => setDeleteId(a.id)} className="btn-icon w-7 h-7 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Randevunu Redaktə Et' : 'Yeni Randevu'} size="sm"
        footer={<>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Ləğv et</button>
          <button onClick={handleSave} className="btn-primary"><Save size={14} /> Yadda saxla</button>
        </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Başlıq *</label>
            <input className="input-field" placeholder="Randevu başlığı" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Müştəri adı</label>
              <input className="input-field" placeholder="Ad Soyad" value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="input-field" placeholder="050-000-0000" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Tarix *</label>
              <input type="date" className="input-field" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Saat</label>
              <input type="time" className="input-field" value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Müddət (dəq)</label>
              <input type="number" className="input-field" placeholder="60" value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select-field" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Qeyd</label>
            <textarea className="input-field resize-none h-16" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Randevunu Sil" message="Bu randevunu silmək istədiyinizə əminsiniz?" />
    </div>
  );
}
