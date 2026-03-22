import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, Loader2, Github } from 'lucide-react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.api?.onUpdaterStatus) return;

    const unsub = window.api.onUpdaterStatus((data) => {
      setStatus(data.status);

      if (data.status === 'available') {
        setUpdateInfo(data);
        setDismissed(false);
      }
      if (data.status === 'downloading') {
        setProgress(data.percent || 0);
      }
      if (data.status === 'downloaded') {
        setUpdateInfo(prev => ({ ...prev, ...data }));
      }
    });

    return () => { if (unsub) unsub(); };
  }, []);

  if (dismissed || !status || status === 'up-to-date' || status === 'checking' || status === 'error') return null;

  const version = updateInfo?.version || '?';

  // Steps state
  const steps = [
    { label: 'Dəyişikliklər Yüklənir..', done: progress > 30 || status === 'downloaded' },
    { label: 'Fayllar Aktarılır..', done: progress > 70 || status === 'downloaded' },
    { label: 'Yeniliklər Yoxlanır..', done: status === 'downloaded' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-[520px] rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-dark-700/40" style={{ background: 'linear-gradient(145deg, #0f1729 0%, #0a1628 30%, #0d1f3d 60%, #091322 100%)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Github size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {status === 'downloaded' ? 'Güncəlləmə Hazırdır!' : "GitHub'a Güncəllənir..."}
            </h2>
          </div>
          <span className="text-xs text-dark-400 font-medium">Smart Qeyd</span>
        </div>

        {/* Illustration area */}
        <div className="flex justify-center py-4">
          <div className="relative w-48 h-32 flex items-center justify-center">
            {/* Cloud/city silhouette background */}
            <div className="absolute inset-0 flex items-end justify-center opacity-20">
              <div className="flex gap-1 items-end">
                {[40, 55, 35, 60, 45, 50, 30, 55, 40].map((h, i) => (
                  <div key={i} className="bg-primary-400/60 rounded-t-sm" style={{ width: '8px', height: `${h}px` }} />
                ))}
              </div>
            </div>
            {/* Central icon */}
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600/30 to-dark-800/80 border border-primary-500/30 flex items-center justify-center shadow-2xl shadow-primary-500/20">
              {status === 'downloaded' ? (
                <CheckCircle size={36} className="text-emerald-400" />
              ) : status === 'downloading' ? (
                <Download size={36} className="text-primary-400 animate-bounce" />
              ) : (
                <Download size={36} className="text-primary-400" />
              )}
            </div>
            {/* Floating paper planes */}
            <div className="absolute top-2 right-4 text-primary-300/40 rotate-12 text-lg">&#9992;</div>
            <div className="absolute top-6 right-12 text-primary-300/25 -rotate-6 text-sm">&#9992;</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-8 mb-4">
          <div className="w-full h-3 bg-dark-800 rounded-full overflow-hidden border border-dark-700/50">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: status === 'downloaded' ? '100%' : `${progress}%`,
                background: status === 'downloaded'
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #3b82f6, #60a5fa, #38bdf8)',
                boxShadow: status === 'downloaded'
                  ? '0 0 12px rgba(16, 185, 129, 0.5)'
                  : '0 0 12px rgba(59, 130, 246, 0.5)',
              }}
            />
          </div>
          <p className="text-center text-sm font-semibold mt-2" style={{ color: status === 'downloaded' ? '#34d399' : '#60a5fa' }}>
            {status === 'downloaded' ? 'Güncəlləmə Tamamlandı!' : `Güncəlləmə Göndərilir...  ${progress}%`}
          </p>
        </div>

        {/* Steps */}
        <div className="px-8 mb-5 space-y-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <Loader2 size={18} className="text-primary-400 shrink-0 animate-spin" />
              )}
              <span className={`text-sm font-medium ${step.done ? 'text-emerald-300' : 'text-dark-300'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-dark-700/30">
          <p className="text-xs text-dark-500">
            Zəhmət olmasa, biraz gözləyin...
          </p>
          <div className="flex gap-2">
            {status === 'downloaded' && (
              <button
                onClick={() => window.api?.installUpdate?.()}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-emerald-600/30"
              >
                Quraşdır
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="px-5 py-2 rounded-lg bg-dark-800/80 hover:bg-dark-700 border border-dark-600/50 hover:border-dark-500 text-dark-300 hover:text-white text-sm font-medium transition-all duration-300"
            >
              İmtina Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
