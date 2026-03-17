import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, RefreshCw, Package, AlertTriangle, CreditCard, Shield, Info } from 'lucide-react';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { useLanguage } from '../contexts/LanguageContext';

function getTypeConfig(t) {
  return {
    low_stock: { icon: Package, color: 'text-amber-400 bg-amber-500/10 border-amber-800/30', label: t('stock') },
    unpaid_debts: { icon: CreditCard, color: 'text-red-400 bg-red-500/10 border-red-800/30', label: t('debt') },
    license: { icon: Shield, color: 'text-purple-400 bg-purple-500/10 border-purple-800/30', label: t('license') },
    warning: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-800/30', label: t('warning') },
    info: { icon: Info, color: 'text-blue-400 bg-blue-500/10 border-blue-800/30', label: t('info') },
  };
}

export default function Notifications() {
  const { showNotification, currentUser } = useApp();
  const { t } = useLanguage();
  const TYPE_CONFIG = getTypeConfig(t);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  useEffect(() => { loadNotifs(); }, []);

  async function loadNotifs() {
    setLoading(true);
    try {
      if (window.api?.checkSystemNotifications && window.api?.getNotifications) {
        await window.api.checkSystemNotifications(currentUser?.id);
        const res = await window.api.getNotifications(currentUser?.id, 100);
        if (res.success) setNotifs(res.data || []);
        return;
      }

      await apiRequest('/notifications/check', {
        method: 'POST',
        token: getToken(),
        body: { user_id: currentUser?.id },
      });

      const res = await apiRequest(`/notifications?${new URLSearchParams({
        userId: currentUser?.id || '',
        limit: 100,
      }).toString()}`, { token: getToken() });
      if (res.success) setNotifs(res.data || []);
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id) {
    if (window.api?.markNotificationRead) {
      await window.api.markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      return;
    }
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT', token: getToken() });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  }

  async function handleMarkAllRead() {
    if (window.api?.markAllNotificationsRead) {
      await window.api.markAllNotificationsRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
      showNotification('Hamısı oxundu kimi işarələndi', 'success');
      return;
    }

    await apiRequest('/notifications/read-all', { method: 'PUT', token: getToken(), body: { user_id: currentUser?.id } });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    showNotification('Hamısı oxundu kimi işarələndi', 'success');
  }

  async function handleDelete(id) {
    if (window.api?.deleteNotification) {
      await window.api.deleteNotification(id);
      setNotifs(prev => prev.filter(n => n.id !== id));
      return;
    }
    await apiRequest(`/notifications/${id}`, { method: 'DELETE', token: getToken() });
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  function formatDate(dt) {
    if (!dt) return '';
    try { return new Date(dt).toLocaleString('az-AZ'); } catch { return dt; }
  }

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Bell size={18} className="text-amber-400" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Bildirişlər</h1>
            <p className="text-dark-400 text-xs">{unread > 0 ? `${unread} oxunmamış` : 'Hamısı oxunub'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadNotifs} className="p-2 hover:bg-dark-800 text-dark-400 hover:text-white rounded-xl transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-3 py-2 rounded-xl transition-colors">
              <CheckCheck size={14} />
              Hamısını oxu
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <Bell size={48} className="mb-3 opacity-30" />
            <p>Bildiriş yoxdur</p>
            <button onClick={loadNotifs} className="mt-3 text-primary-400 hover:text-primary-300 text-sm">Yenilə</button>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {notifs.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={notif.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${notif.is_read ? 'bg-dark-900/50 border-dark-800/50 opacity-70' : `${cfg.color} bg-opacity-50`}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.is_read ? 'bg-dark-800 text-dark-400' : cfg.color.split(' ')[1] + ' ' + cfg.color.split(' ')[0]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium text-sm ${notif.is_read ? 'text-dark-300' : 'text-white'}`}>{notif.title}</p>
                        {notif.message && <p className="text-xs text-dark-400 mt-0.5">{notif.message}</p>}
                        <p className="text-xs text-dark-600 mt-1">{formatDate(notif.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.is_read && (
                          <button onClick={() => handleMarkRead(notif.id)}
                            className="p-1.5 hover:bg-dark-700 text-dark-400 hover:text-emerald-400 rounded-lg transition-colors" title="Oxundu">
                            <CheckCheck size={13} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(notif.id)}
                          className="p-1.5 hover:bg-dark-700 text-dark-400 hover:text-red-400 rounded-lg transition-colors" title="Sil">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
