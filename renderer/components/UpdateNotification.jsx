import React, { useState, useEffect, useMemo } from 'react';
import { Download, X, CheckCircle, Loader2, ArrowDownCircle, Sparkles, Shield, Zap, RotateCw } from 'lucide-react';

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
  const isDownloaded = status === 'downloaded';
  const isDownloading = status === 'downloading';

  const steps = [
    { label: 'Yeni versiya yoxlanılır', done: true },
    { label: 'Fayllar endirilir', done: progress > 40 || isDownloaded },
    { label: 'Güncəlləmə hazırlanır', done: progress > 80 || isDownloaded },
    { label: 'Quraşdırmaya hazır', done: isDownloaded },
  ];

  const activeStep = steps.filter(s => s.done).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-[540px] rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/[0.06]">
        {/* Animated gradient background */}
        <div className="relative" style={{ background: 'linear-gradient(160deg, #0c1424 0%, #111d35 30%, #0a1628 60%, #0d0f1a 100%)' }}>

          {/* Decorative glow orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full opacity-20 blur-3xl pointer-events-none" 
            style={{ background: isDownloaded ? 'radial-gradient(circle, #10b981 0%, transparent 70%)' : 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-60 h-40 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />

          {/* Header */}
          <div className="relative flex items-center justify-between px-7 pt-7 pb-2">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                isDownloaded 
                  ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 shadow-emerald-500/10' 
                  : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/20 shadow-blue-500/10'
              }`}>
                {isDownloaded ? (
                  <CheckCircle size={24} className="text-emerald-400" />
                ) : (
                  <ArrowDownCircle size={24} className="text-blue-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {isDownloaded ? 'Güncəlləmə Hazırdır!' : 'Yeni Güncəlləmə'}
                </h2>
                <p className="text-xs text-dark-400 mt-0.5">
                  {isDownloaded ? 'Quraşdırmaq üçün hazırdır' : `Versiya ${version} endirilir...`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                isDownloaded 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                v{version}
              </span>
            </div>
          </div>

          {/* Central visual area */}
          <div className="relative flex justify-center py-6">
            <div className="relative">
              {/* Outer ring */}
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                isDownloaded ? 'border-2 border-emerald-500/20' : 'border-2 border-blue-500/20'
              }`} style={{
                background: isDownloaded 
                  ? 'conic-gradient(from 0deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)' 
                  : `conic-gradient(from 0deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.15) ${progress}%, transparent ${progress}%, transparent 100%)`
              }}>
                {/* Inner circle */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border ${
                  isDownloaded 
                    ? 'bg-emerald-500/5 border-emerald-500/15' 
                    : 'bg-blue-500/5 border-blue-500/15'
                }`}>
                  <div className="flex flex-col items-center gap-1">
                    {isDownloaded ? (
                      <>
                        <CheckCircle size={32} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400">100%</span>
                      </>
                    ) : (
                      <>
                        <Download size={28} className={`text-blue-400 ${isDownloading ? 'animate-bounce' : ''}`} />
                        <span className="text-xs font-bold text-blue-400">{Math.round(progress)}%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating particles */}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/10 flex items-center justify-center">
                <Sparkles size={10} className="text-blue-400/60" />
              </div>
              <div className="absolute -bottom-1 -left-3 w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/10 flex items-center justify-center">
                <Zap size={9} className="text-purple-400/60" />
              </div>
              <div className="absolute top-3 -left-4 w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
                <Shield size={8} className="text-emerald-400/60" />
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-8 mb-5">
            <div className="relative w-full h-2 bg-dark-800/80 rounded-full overflow-hidden border border-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: isDownloaded ? '100%' : `${progress}%`,
                  background: isDownloaded
                    ? 'linear-gradient(90deg, #059669, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)',
                  boxShadow: isDownloaded
                    ? '0 0 16px rgba(16, 185, 129, 0.4), 0 0 4px rgba(16, 185, 129, 0.6)'
                    : '0 0 16px rgba(59, 130, 246, 0.4), 0 0 4px rgba(59, 130, 246, 0.6)',
                }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="px-8 mb-6">
            <div className="grid grid-cols-2 gap-2.5">
              {steps.map((step, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-500 ${
                  step.done 
                    ? 'bg-emerald-500/5 border-emerald-500/15' 
                    : i === activeStep 
                      ? 'bg-blue-500/5 border-blue-500/15' 
                      : 'bg-dark-800/30 border-white/[0.04]'
                }`}>
                  {step.done ? (
                    <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                  ) : i === activeStep ? (
                    <Loader2 size={15} className="text-blue-400 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-[15px] h-[15px] rounded-full border border-dark-600 shrink-0" />
                  )}
                  <span className={`text-xs font-medium ${
                    step.done ? 'text-emerald-300/90' : i === activeStep ? 'text-blue-300/90' : 'text-dark-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-7 py-5 border-t border-white/[0.04] bg-dark-950/30">
            <p className="text-[11px] text-dark-500">
              {isDownloaded ? 'Proqram yenidən başladılacaq' : 'Zəhmət olmasa gözləyin...'}
            </p>
            <div className="flex gap-2.5">
              {isDownloaded && (
                <button
                  onClick={() => window.api?.installUpdate?.()}
                  className="group relative px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all duration-300 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <RotateCw size={14} />
                    Quraşdır və Yenidən Başlat
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              )}
              <button
                onClick={() => setDismissed(true)}
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] text-dark-400 hover:text-dark-200 text-sm font-medium transition-all duration-300"
              >
                {isDownloaded ? 'Sonra' : 'İmtina Et'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
