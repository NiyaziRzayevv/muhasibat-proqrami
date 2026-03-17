import React, { useEffect, useState } from 'react';
import { Lock, LogOut, Clock, Calendar, Infinity } from 'lucide-react';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

export default function NoAccess() {
  const { currentUser, handleLogout, userAccess, checkAccess } = useApp();
  const { t } = useLanguage();
  const [checking, setChecking] = useState(false);

  async function doLogout() {
    await handleLogout();
  }

  async function refreshAccess() {
    if (!currentUser) return;
    setChecking(true);
    try { await checkAccess(currentUser); }
    finally { setChecking(false); }
  }

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      checkAccess(currentUser);
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser, checkAccess]);

  const isExpired = userAccess?.reason === 'expired';

  return (
    <div className="h-screen flex items-center justify-center bg-dark-950">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock size={36} className="text-red-400" />
        </div>

        <h1 className="text-2xl font-black text-white mb-2">{isExpired ? 'İstifadə Məhdudlaşdırıldı' : 'İcazəniz Yoxdur'}</h1>
        <p className="text-dark-400 mb-8 leading-relaxed">
          {isExpired
            ? 'Verdiyiniz icazə müddəti bitdi. Zəhmət olmasa +994556115900 nömrəsi ilə əlaqə saxlayın və ya sizə yenidən icazə verilənə qədər gözləyin.'
            : 'Bu sistemə giriş üçün admin tərəfindən icazə almalısınız. Zəhmət olmasa administratorla əlaqə saxlayın.'}
        </p>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 mb-6 text-left">
          <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">İcazə növləri</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock size={14} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Günlük</p>
                <p className="text-xs text-dark-500">24 saat müddətinə giriş</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Calendar size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Aylıq</p>
                <p className="text-xs text-dark-500">1 ay müddətinə giriş</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Infinity size={14} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Ömürlük</p>
                <p className="text-xs text-dark-500">Müddətsiz giriş</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center font-bold text-primary-400 text-sm shrink-0">
            {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{currentUser?.full_name || currentUser?.username}</p>
            <p className="text-xs text-dark-500">@{currentUser?.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={refreshAccess}
            disabled={checking}
            className="flex items-center justify-center gap-2 w-full bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-300 hover:text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <div className={`w-4 h-4 border-2 border-primary-300/30 border-t-primary-300 rounded-full ${checking ? 'animate-spin' : 'opacity-0'}`} />
            Yenilə
          </button>
          <button
            onClick={doLogout}
            className="flex items-center justify-center gap-2 w-full bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white font-medium py-3 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            Çıxış
          </button>
        </div>
      </div>
    </div>
  );
}
