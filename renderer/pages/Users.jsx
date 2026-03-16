import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit3, Trash2, Shield, CheckCircle, X, Key, Eye, EyeOff, UserCheck, UserX, Clock, Phone, Mail, AlertCircle, Calendar, Infinity, Ban, Zap } from 'lucide-react';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';

const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-400',
  manager: 'bg-blue-500/20 text-blue-400',
  cashier: 'bg-emerald-500/20 text-emerald-400',
  worker: 'bg-amber-500/20 text-amber-400',
  viewer: 'bg-dark-500/20 text-dark-400',
};

const EMPTY = { username: '', password: '', full_name: '', email: '', role_id: '', is_active: true };

export default function Users() {
  const { showNotification, currentUser } = useApp();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [permEditing, setPermEditing] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approving, setApproving] = useState(null);
  const [grantingAccess, setGrantingAccess] = useState(null);
  const [accessModal, setAccessModal] = useState(null); // { user }
  const [customAccess, setCustomAccess] = useState({ value: '', unit: 'hour' });

  useEffect(() => { loadAll(); }, [activeTab]);

  async function loadAll() {
    setLoading(true);
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        apiBridge.getUsers(),
        apiBridge.getRoles(),
        apiBridge.getPendingUsers()
      ]);
      if (uRes.success) setUsers(uRes.data || []);
      if (rRes.success) setRoles(rRes.data || []);
      if (pRes.success) setPendingUsers(pRes.data || []);
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function handleApprove(userId) {
    setApproving(userId);
    try {
      const res = await apiBridge.approveUser(userId, currentUser?.id || 1);
      await loadAll();
      if (res.success) {
        showNotification('İstifadəçi təsdiqləndi', 'success');
      } else {
        showNotification(res.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setApproving(null); }
  }

  async function handleGrantAccess(userId, accessType, customDuration = null) {
    setGrantingAccess(userId + accessType);
    try {
      const res = await apiBridge.grantAccess(userId, accessType, currentUser?.id || 1, customDuration || null);
      if (res.success) {
        const labels = { daily: 'Günlük', monthly: 'Aylıq', lifetime: 'Ömürlük' };
        const customLabel = accessType === 'custom'
          ? `${customDuration?.value} ${customDuration?.unit === 'minute' ? 'dəqiqə' : 'saat'}`
          : (labels[accessType] || accessType);
        showNotification(`${customLabel} icazə verildi`, 'success');
        setAccessModal(null);
        await loadAll();
      } else { showNotification(res.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setGrantingAccess(null); }
  }

  async function handleRevokeAccess(userId) {
    if (!confirm('Bu istifadəçinin sistemə girişini ləğv etmək istəyirsiniz?')) return;
    try {
      const res = await apiBridge.revokeAccess(userId, currentUser?.id || 1);
      if (res.success) { showNotification('Giriş ləğv edildi', 'success'); await loadAll(); }
      else showNotification(res.error || 'Xəta', 'error');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
  }

  function getAccessBadge(user) {
    if (user.username === 'admin' || user.role_name === 'admin') return null;
    if (!user.access_type) return { label: 'İcazəsiz', cls: 'bg-red-500/20 text-red-400', Icon: Ban };
    if (user.access_type === 'lifetime') return { label: 'Ömürlük', cls: 'bg-amber-500/20 text-amber-400', Icon: Infinity };
    if (user.access_type === 'custom') {
      const exp = user.access_expires_at ? new Date(user.access_expires_at) : null;
      if (exp && exp < new Date()) return { label: 'Müddəti bitib', cls: 'bg-red-500/20 text-red-400', Icon: Ban };
      if (!exp) return { label: 'Xüsusi', cls: 'bg-purple-500/20 text-purple-400', Icon: Zap };
      const diff = exp - new Date();
      const mins = Math.max(0, Math.ceil(diff / 60000));
      if (mins >= 60) {
        const hrs = Math.ceil(mins / 60);
        return { label: `Xüsusi (${hrs}s)`, cls: 'bg-purple-500/20 text-purple-400', Icon: Zap };
      }
      return { label: `Xüsusi (${mins}d)`, cls: 'bg-purple-500/20 text-purple-400', Icon: Zap };
    }
    if (user.access_type === 'monthly') {
      const exp = user.access_expires_at ? new Date(user.access_expires_at) : null;
      if (exp && exp < new Date()) return { label: 'Müddəti bitib', cls: 'bg-red-500/20 text-red-400', Icon: Ban };
      const days = exp ? Math.ceil((exp - new Date()) / 86400000) : 0;
      return { label: `Aylıq (${days}g)`, cls: 'bg-emerald-500/20 text-emerald-400', Icon: Calendar };
    }
    if (user.access_type === 'daily') {
      const exp = user.access_expires_at ? new Date(user.access_expires_at) : null;
      if (exp && exp < new Date()) return { label: 'Müddəti bitib', cls: 'bg-red-500/20 text-red-400', Icon: Ban };
      return { label: 'Günlük', cls: 'bg-blue-500/20 text-blue-400', Icon: Clock };
    }
    return null;
  }

  async function handleReject(userId) {
    if (!confirm('Bu istifadəçinin qeydiyyatını rədd etmək istəyirsiniz?')) return;
    setApproving(userId);
    try {
      const res = await apiBridge.rejectUser(userId, 1);
      if (res.success) {
        showNotification('Qeydiyyat rədd edildi', 'success');
        await loadAll();
      } else {
        showNotification(res.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setApproving(null); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, role_id: roles[0]?.id || '' });
    setModal(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ username: user.username, password: '', full_name: user.full_name || '', email: user.email || '', role_id: user.role_id || '', is_active: user.is_active === 1 });
    setModal(true);
  }

  async function handleSave() {
    if (!form.username) { showNotification('İstifadəçi adı mütləqdir', 'error'); return; }
    if (!editing && !form.password) { showNotification('Şifrə mütləqdir', 'error'); return; }
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.password) delete data.password;
      const res = editing
        ? await apiBridge.updateUser(editing.id, data)
        : await apiBridge.createUser(data);
      if (res.success) {
        showNotification(editing ? 'İstifadəçi yeniləndi' : 'İstifadəçi yaradıldı', 'success');
        setModal(false);
        await loadAll();
      } else { showNotification(res.error || 'Xəta', 'error'); }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleToggleActive(user) {
    const res = await apiBridge.updateUser(user.id, { is_active: !user.is_active });
    if (res.success) { showNotification(user.is_active ? 'Deaktivləşdirildi' : 'Aktivləşdirildi', 'success'); await loadAll(); }
    else showNotification(res.error || 'Xəta', 'error');
  }

  async function handleDelete(id) {
    if (!confirm('Bu istifadəçini silmək istəyirsiniz?')) return;
    const res = await apiBridge.deleteUser(id);
    if (res.success) { showNotification('Silindi', 'success'); await loadAll(); }
    else showNotification(res.error || 'Xəta', 'error');
  }

  async function handleSavePermissions(roleId, permissions) {
    const res = await apiBridge.updateRolePermissions(roleId, permissions);
    if (res.success) { showNotification('İcazələr yeniləndi', 'success'); await loadAll(); setPermEditing(null); }
    else showNotification(res.error || 'Xəta', 'error');
  }

  const PERM_LABELS = {
    dashboard: 'Dashboard', records: 'Servis Qeydləri', sales: 'Satışlar', pos: 'POS / Kassa',
    products: 'Məhsullar', customers: 'Müştərilər', suppliers: 'Təchizatçılar',
    reports: 'Hesabatlar', export: 'Export', settings: 'Ayarlar',
    users: 'İstifadəçilər', finance: 'Maliyyə', expenses: 'Xərclər',
    audit: 'Audit Log', license: 'Lisenziya', backup: 'Backup',
    deleteRecords: 'Qeydləri sil', deleteProducts: 'Məhsulları sil', deleteSales: 'Satışları sil',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <UsersIcon size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">İstifadəçilər & Rollar</h1>
            <p className="text-dark-400 text-xs">Giriş icazələrini idarə et</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-dark-800 border border-dark-700 rounded-xl p-1">
            <button onClick={() => setActiveTab('pending')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'pending' ? 'bg-amber-600 text-white' : 'text-dark-400 hover:text-white'}`}>
              <Clock size={14} /> Gözləyənlər
              {pendingUsers.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            {['users', 'roles'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>
                {t === 'users' ? 'İstifadəçilər' : 'Rollar'}
              </button>
            ))}
          </div>
          {activeTab === 'users' && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm">
              <Plus size={16} />
              Yeni istifadəçi
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'pending' ? (
          /* Pending Users Tab */
          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500/30" />
                <p className="text-dark-400">Gözləyən istifadəçi yoxdur</p>
                <p className="text-dark-600 text-sm mt-1">Bütün qeydiyyatlar təsdiqlənib</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/30 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-amber-400" />
                  <p className="text-amber-300 text-sm">
                    <strong>{pendingUsers.length}</strong> yeni qeydiyyat təsdiq gözləyir
                  </p>
                </div>
                {pendingUsers.map(user => (
                  <div key={user.id} className="bg-dark-900 border border-amber-800/30 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          <Clock size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user.full_name || user.username}</p>
                          <p className="text-sm text-dark-400">@{user.username}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {user.phone && (
                              <span className="flex items-center gap-1 text-xs text-dark-500">
                                <Phone size={10} /> {user.phone}
                              </span>
                            )}
                            {user.email && (
                              <span className="flex items-center gap-1 text-xs text-dark-500">
                                <Mail size={10} /> {user.email}
                              </span>
                            )}
                            <span className="text-xs text-dark-600">
                              Qeydiyyat: {user.created_at?.split('T')[0] || user.created_at}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReject(user.id)}
                          disabled={approving === user.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <UserX size={14} /> Rədd et
                        </button>
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={approving === user.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {approving === user.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <UserCheck size={14} />
                          )}
                          Təsdiqlə
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="grid gap-4">
            {users.map(user => (
              <div key={user.id} className={`bg-dark-900 border rounded-2xl p-5 transition-all ${user.is_active ? 'border-dark-800' : 'border-dark-800/30 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${user.is_active ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-800 text-dark-500'}`}>
                      {(user.full_name || user.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{user.full_name || user.username}</p>
                        <span className="text-xs font-mono bg-dark-800 text-dark-400 px-2 py-0.5 rounded-lg">#{user.id}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${ROLE_COLORS[user.role_name] || ROLE_COLORS.viewer}`}>
                          {user.role_display || user.role_name}
                        </span>
                        {!user.is_active && <span className="text-xs bg-dark-700 text-dark-400 px-2 py-0.5 rounded-lg">Deaktiv</span>}
                        {(() => { const b = getAccessBadge(user); if (!b) return null; const Icon = b.Icon; return (
                          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${b.cls}`}>
                            <Icon size={10} /> {b.label}
                          </span>
                        ); })()}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-sm text-dark-400">@{user.username}</p>
                        {user.email && <p className="text-sm text-dark-500">{user.email}</p>}
                        {user.last_login && <p className="text-xs text-dark-600">Son giriş: {user.last_login?.split('T')[0] || user.last_login}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.username !== 'admin' && (
                      <button onClick={() => setAccessModal({ user })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 rounded-lg text-xs font-medium transition-colors">
                        <Key size={12} /> İcazə Ver
                      </button>
                    )}
                    {user.username !== 'admin' && user.access_type && (
                      <button onClick={() => handleRevokeAccess(user.id)}
                        className="p-2 hover:bg-red-900/30 text-dark-500 hover:text-red-400 rounded-lg transition-colors" title="Girişi ləğv et">
                        <Ban size={14} />
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(user)} title={user.is_active ? 'Deaktiv et' : 'Aktiv et'}
                      className={`p-2 rounded-lg transition-colors ${user.is_active ? 'hover:bg-amber-900/30 text-dark-400 hover:text-amber-400' : 'hover:bg-emerald-900/30 text-dark-400 hover:text-emerald-400'}`}>
                      {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                    <button onClick={() => openEdit(user)} className="p-2 hover:bg-dark-700 text-dark-400 hover:text-white rounded-lg transition-colors">
                      <Edit3 size={15} />
                    </button>
                    {user.username !== 'admin' && (
                      <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-900/30 text-dark-400 hover:text-red-400 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-16 text-dark-500">
                <UsersIcon size={48} className="mx-auto mb-3 opacity-30" />
                <p>İstifadəçi tapılmadı</p>
              </div>
            )}
          </div>
        ) : (
          /* Roles Tab */
          <div className="grid gap-4">
            {roles.map(role => {
              const perms = (() => { try { return JSON.parse(role.permissions || '{}'); } catch { return {}; } })();
              const isEditing = permEditing?.id === role.id;
              const editPerms = isEditing ? permEditing.perms : perms;
              return (
                <div key={role.id} className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ROLE_COLORS[role.name] || 'bg-dark-700 text-dark-400'}`}>
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{role.display_name}</p>
                        <p className="text-xs text-dark-500">@{role.name}</p>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => setPermEditing(null)} className="text-xs text-dark-400 hover:text-white px-3 py-1.5 bg-dark-800 rounded-lg transition-colors">İmtina</button>
                        <button onClick={() => handleSavePermissions(role.id, editPerms)} className="text-xs text-white bg-primary-600 hover:bg-primary-500 px-3 py-1.5 rounded-lg transition-colors">Yadda saxla</button>
                      </div>
                    ) : (
                      <button onClick={() => setPermEditing({ id: role.id, perms: { ...perms } })}
                        className="text-xs text-primary-400 hover:text-primary-300 px-3 py-1.5 bg-primary-500/10 rounded-lg transition-colors">
                        İcazələri düzəlt
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PERM_LABELS).map(([key, label]) => {
                      const val = editPerms[key];
                      return (
                        <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isEditing ? 'hover:bg-dark-800' : ''} ${val ? 'bg-dark-800/50' : 'opacity-50'}`}>
                          <input type="checkbox" checked={!!val} disabled={!isEditing}
                            onChange={e => isEditing && setPermEditing(prev => ({ ...prev, perms: { ...prev.perms, [key]: e.target.checked } }))}
                            className="rounded accent-primary-500" />
                          <span className="text-xs text-dark-300">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">{editing ? 'İstifadəçini düzəlt' : 'Yeni istifadəçi'}</h2>
              <button onClick={() => setModal(false)} className="text-dark-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">İstifadəçi adı *</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="username" disabled={!!editing} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Tam ad</label>
                  <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="Ad Soyad" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">{editing ? 'Yeni şifrə (boş buraxsanız dəyişməz)' : 'Şifrə *'}</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder={editing ? '(dəyişməz)' : 'Şifrə...'} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="email@domain.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Rol</label>
                  <select value={form.role_id} onChange={e => setForm({ ...form, role_id: parseInt(e.target.value) })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500">
                    {roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-primary-500" />
                <span className="text-sm text-dark-300">Aktiv</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 bg-dark-800 hover:bg-dark-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">İmtina</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={15} />}
                {editing ? 'Yenilə' : 'Yarat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Grant Modal */}
      {accessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Sistem İcazəsi Ver</h2>
                <p className="text-dark-500 text-xs mt-0.5">@{accessModal.user.username}</p>
              </div>
              <button onClick={() => setAccessModal(null)} className="text-dark-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3 mb-5">
              <button
                onClick={() => handleGrantAccess(accessModal.user.id, 'daily')}
                disabled={grantingAccess !== null}
                className="w-full flex items-center gap-4 bg-dark-800 hover:bg-blue-900/30 border border-dark-700 hover:border-blue-700/50 rounded-xl p-4 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-blue-300">Günlük İcazə</p>
                  <p className="text-xs text-dark-500">24 saat giriş hüququ</p>
                </div>
                {grantingAccess === accessModal.user.id + 'daily' && (
                  <div className="ml-auto w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                )}
              </button>
              <button
                onClick={() => handleGrantAccess(accessModal.user.id, 'monthly')}
                disabled={grantingAccess !== null}
                className="w-full flex items-center gap-4 bg-dark-800 hover:bg-emerald-900/30 border border-dark-700 hover:border-emerald-700/50 rounded-xl p-4 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-emerald-300">Aylıq İcazə</p>
                  <p className="text-xs text-dark-500">30 günlük giriş hüququ</p>
                </div>
                {grantingAccess === accessModal.user.id + 'monthly' && (
                  <div className="ml-auto w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                )}
              </button>
              <button
                onClick={() => handleGrantAccess(accessModal.user.id, 'lifetime')}
                disabled={grantingAccess !== null}
                className="w-full flex items-center gap-4 bg-dark-800 hover:bg-amber-900/30 border border-dark-700 hover:border-amber-700/50 rounded-xl p-4 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Infinity size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-amber-300">Ömürlük İcazə</p>
                  <p className="text-xs text-dark-500">Müddətsiz giriş hüququ</p>
                </div>
                {grantingAccess === accessModal.user.id + 'lifetime' && (
                  <div className="ml-auto w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                )}
              </button>

              <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
                <p className="text-xs font-semibold text-dark-400 mb-3">Dəqiqə / Saat</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customAccess.value}
                    onChange={e => setCustomAccess({ ...customAccess, value: e.target.value })}
                    className="col-span-2 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                    placeholder="Məs: 6"
                  />
                  <select
                    value={customAccess.unit}
                    onChange={e => setCustomAccess({ ...customAccess, unit: e.target.value })}
                    className="bg-dark-900 border border-dark-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="hour">Saat</option>
                    <option value="minute">Dəqiqə</option>
                  </select>
                </div>
                <button
                  onClick={() => handleGrantAccess(accessModal.user.id, 'custom', { value: customAccess.value, unit: customAccess.unit === 'minute' ? 'minute' : 'hour' })}
                  disabled={grantingAccess !== null || !customAccess.value}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-300 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Zap size={14} /> Tətbiq et
                </button>
              </div>
            </div>
            <button onClick={() => setAccessModal(null)} className="w-full bg-dark-800 hover:bg-dark-700 text-dark-300 font-medium py-2.5 rounded-xl transition-colors text-sm">
              İmtina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
