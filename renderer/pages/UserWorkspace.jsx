import React, { useState, useEffect } from 'react';
import { User, Clock, CheckCircle, AlertCircle, Calendar, FileText, TrendingUp, Bell, Settings, LogOut } from 'lucide-react';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

export default function UserWorkspace() {
  const { currentUser, showNotification } = useApp();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ todayTasks: 0, completedTasks: 0, pendingTasks: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load user-specific data here
      // For now, show placeholder data
      setStats({
        todayTasks: 3,
        completedTasks: 12,
        pendingTasks: 5,
      });
      setRecentActivity([
        { id: 1, type: 'task', title: 'Yeni tapşırıq yaradıldı', time: '10 dəq əvvəl' },
        { id: 2, type: 'complete', title: 'Tapşırıq tamamlandı', time: '1 saat əvvəl' },
        { id: 3, type: 'note', title: 'Qeyd əlavə edildi', time: '2 saat əvvəl' },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const currentTime = new Date();
  const greeting = currentTime.getHours() < 12 ? 'Sabahınız xeyir' : 
                   currentTime.getHours() < 18 ? 'Günortanız xeyir' : 'Axşamınız xeyir';

  return (
    <div className="min-h-full bg-dark-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/30">
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-dark-400 text-sm">{greeting},</p>
              <h1 className="text-2xl font-bold text-white">{currentUser?.full_name || currentUser?.username}</h1>
              <p className="text-dark-500 text-xs mt-0.5">@{currentUser?.username} · {currentUser?.role_display || 'İstifadəçi'}</p>
            </div>
          </div>
          <p className="text-dark-400">
            {new Date().toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <Clock size={20} className="text-blue-400" />
              <span className="text-xs text-dark-500">Bugün</span>
            </div>
            <p className="text-3xl font-black text-white">{stats.todayTasks}</p>
            <p className="text-sm text-dark-400 mt-1">Aktiv tapşırıq</p>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle size={20} className="text-emerald-400" />
              <span className="text-xs text-dark-500">Həftə</span>
            </div>
            <p className="text-3xl font-black text-emerald-400">{stats.completedTasks}</p>
            <p className="text-sm text-dark-400 mt-1">Tamamlanmış</p>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <AlertCircle size={20} className="text-amber-400" />
              <span className="text-xs text-dark-500">Ümumi</span>
            </div>
            <p className="text-3xl font-black text-amber-400">{stats.pendingTasks}</p>
            <p className="text-sm text-dark-400 mt-1">Gözləyən</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-4">Sürətli əməliyyatlar</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl p-4 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FileText size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white">Yeni qeyd</p>
                <p className="text-xs text-dark-500">Qeyd əlavə et</p>
              </div>
            </button>
            <button className="flex items-center gap-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl p-4 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Calendar size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">Randevu</p>
                <p className="text-xs text-dark-500">Randevu planla</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-4">Son fəaliyyət</h2>
          <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={32} className="mx-auto mb-3 text-dark-600" />
                <p className="text-dark-500">Hələ fəaliyyət yoxdur</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-700">
                {recentActivity.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-dark-700/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.type === 'complete' ? 'bg-emerald-500/20' :
                      item.type === 'task' ? 'bg-blue-500/20' : 'bg-dark-700'
                    }`}>
                      {item.type === 'complete' ? <CheckCircle size={14} className="text-emerald-400" /> :
                       item.type === 'task' ? <FileText size={14} className="text-blue-400" /> :
                       <FileText size={14} className="text-dark-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.title}</p>
                      <p className="text-xs text-dark-500">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-primary-900/20 border border-primary-800/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Bell size={20} className="text-primary-400 mt-0.5" />
            <div>
              <p className="font-medium text-primary-300">Məlumat</p>
              <p className="text-sm text-primary-400/80 mt-1">
                Bu sizin şəxsi iş panelinizdir. Burada yalnız sizə aid tapşırıqlar və fəaliyyətlər göstərilir.
                Admin paneli və sistem ayarları sizin üçün əlçatan deyil.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
