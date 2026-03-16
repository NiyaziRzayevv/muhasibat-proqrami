import React, { useState } from 'react';
import {
  CheckSquare, Plus, Trash2, Edit3, X, Search,
  Flag, Calendar, Circle, CheckCircle2, Clock, Save, AlertCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useApp } from '../App';

const PRIORITY = {
  high:   { label: 'Yüksək', cls: 'bg-red-500/20 text-red-400 border-red-700/30',    dot: 'bg-red-400' },
  medium: { label: 'Orta',   cls: 'bg-amber-500/20 text-amber-400 border-amber-700/30', dot: 'bg-amber-400' },
  low:    { label: 'Aşağı',  cls: 'bg-blue-500/20 text-blue-400 border-blue-700/30',  dot: 'bg-blue-400' },
};

const STATUS_COLS = [
  { key: 'todo',        label: 'Gözləyir',    icon: Circle,       cls: 'text-dark-400' },
  { key: 'in_progress', label: 'Davam edir',  icon: Clock,        cls: 'text-amber-400' },
  { key: 'done',        label: 'Tamamlandı',  icon: CheckCircle2, cls: 'text-emerald-400' },
];

const EMPTY = { title: '', description: '', priority: 'medium', status: 'todo', due_date: '', assigned_to: '' };

function loadFromStorage() {
  try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; }
}
function saveToStorage(data) { localStorage.setItem('tasks', JSON.stringify(data)); }

export default function Tasks() {
  const { showNotification } = useApp();
  const [tasks, setTasks] = useState(loadFromStorage);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState(null);
  const [viewMode, setViewMode] = useState('kanban');

  function persist(data) { setTasks(data); saveToStorage(data); }

  function openCreate(status = 'todo') {
    setEditing(null);
    setForm({ ...EMPTY, status });
    setModalOpen(true);
  }

  function openEdit(t) { setEditing(t); setForm({ ...t }); setModalOpen(true); }

  function handleSave() {
    if (!form.title.trim()) { showNotification('Başlıq daxil edin', 'error'); return; }
    if (editing) {
      persist(tasks.map(t => t.id === editing.id ? { ...form, id: editing.id } : t));
      showNotification('Yeniləndi', 'success');
    } else {
      persist([...tasks, { ...form, id: Date.now(), created_at: new Date().toISOString() }]);
      showNotification('Tapşırıq əlavə edildi', 'success');
    }
    setModalOpen(false);
  }

  function handleDelete() {
    persist(tasks.filter(t => t.id !== deleteId));
    setDeleteId(null);
    showNotification('Silindi', 'success');
  }

  function moveStatus(id, status) {
    persist(tasks.map(t => t.id === id ? { ...t, status } : t));
  }

  function toggleDone(id) {
    persist(tasks.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t));
  }

  const filtered = tasks.filter(t => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CheckSquare size={22} className="text-primary-400" /> Tapşırıqlar
          </h1>
          <p className="text-sm text-dark-400 mt-0.5">
            {tasks.filter(t => t.status !== 'done').length} aktiv ·
            <span className="text-emerald-400 ml-1">{tasks.filter(t => t.status === 'done').length} tamamlandı</span>
            {overdue > 0 && <span className="text-red-400 ml-1">· {overdue} gecikmiş</span>}
          </p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary text-sm py-2">
          <Plus size={15} /> Yeni Tapşırıq
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {STATUS_COLS.map(col => {
          const Icon = col.icon;
          const count = tasks.filter(t => t.status === col.key).length;
          return (
            <div key={col.key} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                <Icon size={18} className={col.cls} />
              </div>
              <div>
                <p className="text-xs text-dark-400">{col.label}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field pl-8 h-8 text-xs" placeholder="Axtar..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {Object.entries(PRIORITY).map(([k, v]) => (
            <button key={k} onClick={() => setFilterPriority(filterPriority === k ? '' : k)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterPriority === k ? v.cls : 'border-dark-700 text-dark-400 hover:text-white'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />{v.label}
            </button>
          ))}
        </div>
        <div className="flex bg-dark-800 rounded-xl p-1 gap-1">
          {['kanban', 'list'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${viewMode === m ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
              {m === 'kanban' ? 'Kanban' : 'Siyahı'}
            </button>
          ))}
        </div>
        {(search || filterPriority) && (
          <button onClick={() => { setSearch(''); setFilterPriority(''); }}
            className="text-dark-400 hover:text-white"><X size={14} /></button>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
          {STATUS_COLS.map(col => {
            const Icon = col.icon;
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="flex flex-col bg-dark-900/50 rounded-2xl border border-dark-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-dark-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={col.cls} />
                    <span className="font-semibold text-white text-sm">{col.label}</span>
                    <span className="bg-dark-700 text-dark-300 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{colTasks.length}</span>
                  </div>
                  <button onClick={() => openCreate(col.key)} className="w-6 h-6 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white flex items-center justify-center transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {colTasks.map(t => {
                    const isOverdue = t.due_date && t.due_date < today && t.status !== 'done';
                    return (
                      <div key={t.id} className="bg-dark-800 border border-dark-700 rounded-xl p-3 group">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <button onClick={() => toggleDone(t.id)} className="mt-0.5 flex-shrink-0">
                            {t.status === 'done'
                              ? <CheckCircle2 size={15} className="text-emerald-400" />
                              : <Circle size={15} className="text-dark-600 hover:text-white" />}
                          </button>
                          <p className={`text-xs font-medium flex-1 leading-tight ${t.status === 'done' ? 'line-through text-dark-500' : 'text-white'}`}>{t.title}</p>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                            <button onClick={() => openEdit(t)} className="w-5 h-5 flex items-center justify-center text-dark-500 hover:text-white"><Edit3 size={10} /></button>
                            <button onClick={() => setDeleteId(t.id)} className="w-5 h-5 flex items-center justify-center text-dark-500 hover:text-red-400"><Trash2 size={10} /></button>
                          </div>
                        </div>
                        {t.description && <p className="text-[11px] text-dark-500 mb-2 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY[t.priority]?.cls}`}>
                            {PRIORITY[t.priority]?.label}
                          </span>
                          {t.due_date && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-red-400' : 'text-dark-500'}`}>
                              {isOverdue && <AlertCircle size={9} />}
                              <Calendar size={9} />{t.due_date}
                            </span>
                          )}
                        </div>
                        {col.key !== 'done' && (
                          <div className="mt-2 flex gap-1">
                            {STATUS_COLS.filter(c => c.key !== col.key).map(c => (
                              <button key={c.key} onClick={() => moveStatus(t.id, c.key)}
                                className="text-[9px] px-1.5 py-0.5 bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-white rounded transition-colors">
                                → {c.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <button onClick={() => openCreate(col.key)}
                      className="w-full py-6 border border-dashed border-dark-700 rounded-xl text-dark-600 hover:text-dark-400 text-xs transition-colors">
                      + Tapşırıq əlavə et
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Tapşırıq</th><th>Prioritet</th><th>Status</th><th>Son tarix</th><th>Əməliyyat</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16">
                  <div className="empty-state"><CheckSquare size={32} className="text-dark-600 mb-2" /><p className="text-dark-400">Tapşırıq tapılmadı</p></div>
                </td></tr>
              ) : filtered.sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return order[a.priority] - order[b.priority];
              }).map(t => {
                const isOverdue = t.due_date && t.due_date < today && t.status !== 'done';
                return (
                  <tr key={t.id} className={t.status === 'done' ? 'opacity-50' : ''}>
                    <td>
                      <div className="flex items-start gap-2">
                        <button onClick={() => toggleDone(t.id)} className="mt-0.5 flex-shrink-0">
                          {t.status === 'done' ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Circle size={15} className="text-dark-600" />}
                        </button>
                        <div>
                          <p className={`font-medium text-sm ${t.status === 'done' ? 'line-through text-dark-500' : 'text-white'}`}>{t.title}</p>
                          {t.description && <p className="text-xs text-dark-500 truncate max-w-[300px]">{t.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY[t.priority]?.cls}`}>{PRIORITY[t.priority]?.label}</span></td>
                    <td>
                      <select value={t.status} onChange={e => moveStatus(t.id, e.target.value)}
                        className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                        {STATUS_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td>
                      {t.due_date ? (
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-dark-400'}`}>
                          {isOverdue && <AlertCircle size={11} />}{t.due_date}
                        </span>
                      ) : <span className="text-dark-600">—</span>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="btn-icon w-7 h-7"><Edit3 size={12} /></button>
                        <button onClick={() => setDeleteId(t.id)} className="btn-icon w-7 h-7 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Tapşırığı Redaktə Et' : 'Yeni Tapşırıq'} size="sm"
        footer={<>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Ləğv et</button>
          <button onClick={handleSave} className="btn-primary"><Save size={14} /> Yadda saxla</button>
        </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Başlıq *</label>
            <input className="input-field" placeholder="Tapşırıq başlığı" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Açıqlama</label>
            <textarea className="input-field resize-none h-16" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prioritet</label>
              <select className="select-field" value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select-field" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Son tarix</label>
              <input type="date" className="input-field" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Məsul şəxs</label>
              <input className="input-field" placeholder="Ad" value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Tapşırığı Sil" message="Bu tapşırığı silmək istədiyinizə əminsiniz?" />
    </div>
  );
}
