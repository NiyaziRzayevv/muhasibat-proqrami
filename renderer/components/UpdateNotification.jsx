import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, ArrowDownCircle, Sparkles, Loader2 } from 'lucide-react';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [status, setStatus] = useState(null); // checking, available, downloading, downloaded, error
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

  if (dismissed || !status || status === 'up-to-date' || status === 'checking') return null;

  if (status === 'error') return null;

  const version = updateInfo?.version || '?';

  // Parse release notes
  const releaseNotes = updateInfo?.releaseNotes || '';
  const changeItems = releaseNotes
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().replace(/^-\s*/, ''));

  return (
    <div className="fixed top-4 right-4 z-[9999] w-96 animate-fade-in">
      <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600/20 to-primary-500/10 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary-400" />
            <span className="text-sm font-semibold text-white">
              {status === 'downloaded' ? 'Yeniləmə hazırdır!' : status === 'downloading' ? 'Yüklənir...' : `Yeni versiya: v${version}`}
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-dark-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {/* Version badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
              v{version}
            </span>
            {status === 'downloaded' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                Hazır
              </span>
            )}
          </div>

          {/* Changelog */}
          {changeItems.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-dark-400 mb-1.5">Dəyişikliklər:</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {changeItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-dark-300">
                    <CheckCircle size={10} className="text-primary-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Download progress */}
          {status === 'downloading' && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-dark-400 mb-1">
                <span>Yüklənir...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {status === 'available' && (
              <button
                onClick={() => window.api?.downloadUpdate?.()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors"
              >
                <Download size={12} />
                Yüklə
              </button>
            )}
            {status === 'downloading' && (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-dark-800 text-dark-400 text-xs font-semibold">
                <Loader2 size={12} className="animate-spin" />
                Yüklənir...
              </div>
            )}
            {status === 'downloaded' && (
              <button
                onClick={() => window.api?.installUpdate?.()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw size={12} />
                Yenidən başlat və yenilə
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-400 text-xs transition-colors"
            >
              Sonra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
