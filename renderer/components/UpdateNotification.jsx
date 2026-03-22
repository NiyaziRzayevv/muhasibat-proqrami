import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, ArrowDownCircle, Sparkles, Loader2, GitBranch, Calendar, User, FileText } from 'lucide-react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [status, setStatus] = useState(null); // checking, available, downloading, downloaded, error
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  if (dismissed || !status || status === 'up-to-date' || status === 'checking') return null;

  if (status === 'error') return null;

  const version = updateInfo?.version || '?';

  // Parse release notes and GitHub info
  const releaseNotes = updateInfo?.releaseNotes || '';
  const changeItems = releaseNotes
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().replace(/^-\s*/, ''));
  
  const githubInfo = {
    commitHash: updateInfo?.commitHash || 'unknown',
    author: updateInfo?.author || 'System',
    date: updateInfo?.publishedAt ? new Date(updateInfo.publishedAt).toLocaleDateString('az-AZ') : 'Bilinmir',
    size: updateInfo?.downloadSize ? `${(updateInfo.downloadSize / 1024 / 1024).toFixed(1)} MB` : 'Bilinmir'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800 border border-dark-700/50 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden w-[460px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-primary-600/30 via-primary-500/20 to-emerald-500/20 border-b border-dark-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-emerald-500/10 backdrop-blur-sm"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/20 border border-primary-400/30">
                <Sparkles size={18} className="text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {status === 'downloaded' ? '🎉 Yeniləmə hazırdır!' : status === 'downloading' ? '⬇️ Yüklənir...' : `🚀 Yeni versiya: v${version}`}
                </h3>
                <p className="text-xs text-dark-300 mt-0.5">
                  {status === 'downloaded' ? 'Yenidən başlatmaq üçün hazırdır' : status === 'downloading' ? 'Zəhmət olmasa gözləyin...' : 'GitHub-dan yeni güncəlləmə'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {/* Version and GitHub info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-primary-500/20 to-primary-400/20 border border-primary-400/30 text-primary-300">
                📦 v{version}
              </span>
              {status === 'downloaded' && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 border border-emerald-400/30 text-emerald-300">
                  ✅ Hazır
                </span>
              )}
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              {showDetails ? '🔼 Gizlə' : '🔽 Detallar'}
            </button>
          </div>
          
          {/* GitHub Details */}
          {showDetails && (
            <div className="mb-4 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch size={14} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">GitHub Məlumatları</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <FileText size={10} className="text-dark-400" />
                  <span className="text-dark-400">Commit:</span>
                  <code className="text-primary-300 font-mono">{githubInfo.commitHash.substring(0, 7)}</code>
                </div>
                <div className="flex items-center gap-1.5">
                  <User size={10} className="text-dark-400" />
                  <span className="text-dark-400">Müəllif:</span>
                  <span className="text-white">{githubInfo.author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={10} className="text-dark-400" />
                  <span className="text-dark-400">Tarix:</span>
                  <span className="text-white">{githubInfo.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download size={10} className="text-dark-400" />
                  <span className="text-dark-400">Ölçü:</span>
                  <span className="text-white">{githubInfo.size}</span>
                </div>
              </div>
            </div>
          )}

          {/* Changelog */}
          {changeItems.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">📝 Yeniliklər və Dəyişikliklər</span>
              </div>
              <div className="max-h-40 overflow-y-auto pr-2 space-y-2">
                {changeItems.map((item, i) => {
                  const isFeature = item.toLowerCase().includes('yeni') || item.toLowerCase().includes('əlavə') || item.toLowerCase().includes('feature');
                  const isFix = item.toLowerCase().includes('düzəld') || item.toLowerCase().includes('fix') || item.toLowerCase().includes('bug');
                  const isImprovement = item.toLowerCase().includes('yaxşılaş') || item.toLowerCase().includes('optim') || item.toLowerCase().includes('performance');
                  
                  return (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-dark-800/30 border border-dark-700/30">
                      {isFeature && <span className="text-xs">🆕</span>}
                      {isFix && <span className="text-xs">🐛</span>}
                      {isImprovement && <span className="text-xs">⚡</span>}
                      {!isFeature && !isFix && !isImprovement && <CheckCircle size={12} className="text-primary-400 shrink-0 mt-0.5" />}
                      <span className="text-xs text-dark-200 leading-relaxed">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Download progress */}
          {status === 'downloading' && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary-900/30 to-primary-800/20 border border-primary-700/30">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-primary-400" />
                  <span className="font-medium text-primary-300">Yüklənir...</span>
                </div>
                <span className="font-bold text-primary-200">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden border border-dark-700">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-400 rounded-full transition-all duration-500 shadow-lg shadow-primary-500/30"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-dark-400 mt-1.5 text-center">GitHub-dan yüklənir... Zəhmət olmasa gözləyin</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {status === 'available' && (
              <button
                onClick={() => window.api?.downloadUpdate?.()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-primary-600/30 hover:shadow-primary-500/40 hover:scale-105"
              >
                <Download size={14} />
                🚀 İndi Yüklə
              </button>
            )}
            {status === 'downloading' && (
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-dark-800 to-dark-700 text-dark-300 text-sm font-bold border border-dark-600">
                <Loader2 size={14} className="animate-spin" />
                ⏳ Yüklənir...
              </div>
            )}
            {status === 'downloaded' && (
              <button
                onClick={() => window.api?.installUpdate?.()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:scale-105"
              >
                <RefreshCw size={14} />
                🔄 Yenidən başlat
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="px-4 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-white text-sm font-medium transition-all duration-300"
            >
              ⏰ Sonra
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-2 bg-dark-900/50 border-t border-dark-700/50">
          <p className="text-xs text-dark-500 text-center">
            💡 Avtomatik yeniləmə • GitHub ilə sinxronizasiya
          </p>
        </div>
      </div>
    </div>
  );
}
