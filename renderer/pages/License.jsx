import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, XCircle, Clock, Copy, Cpu, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

export default function License() {
  const { showNotification, checkLicense, isAdmin, licenseInfo } = useApp();
  const { t } = useLanguage();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    loadLicense();
  }, []);

  async function loadLicense() {
    setLoading(true);
    try {
      const [licRes, devRes] = await Promise.all([
        window.api.getLicenseStatus(),
        window.api.getDeviceId(),
      ]);
      if (licRes.success) setLicense(licRes.data);
      if (devRes.success) setDeviceId(devRes.data);
    } catch (e) {
      showNotification('Yükləmə xətası: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    if (!licenseKey.trim()) {
      showNotification('Lisenziya açarını daxil edin', 'error');
      return;
    }
    setActivating(true);
    try {
      const res = await window.api.activateLicense(licenseKey.trim());
      if (res.success) {
        showNotification('Lisenziya uğurla aktivləşdirildi!', 'success');
        setLicenseKey('');
        await loadLicense();
        if (checkLicense) await checkLicense();
      } else {
        showNotification(res.error || 'Aktivasiya uğursuz oldu', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    try {
      const res = await window.api.deactivateLicense();
      if (res.success) {
        showNotification('Lisenziya deaktiv edildi', 'success');
        await loadLicense();
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showNotification('Kopyalandı!', 'success'));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = license?.valid;
  const isLifetime = license?.license?.type === 'lifetime';
  const isTimed = license?.license?.type === 'timed' || license?.license?.type === 'trial';
  const isDemo = license?.license?.type === 'demo' || license?.isDemo;
  const licData = license?.license || {};

  const typeLabel = isLifetime ? 'Ömürlük' : isDemo ? 'Demo (10 dəq)' : isTimed ? 'Müddətli' : 'Yoxdur';
  const colorClass = isActive
    ? isLifetime ? 'emerald' : isDemo ? 'amber' : 'blue'
    : 'red';

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Lisenziya</h1>
            <p className="text-dark-400 text-sm">Proqram aktivasiya və lisenziya idarəsi</p>
          </div>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl border p-6 ${isActive
          ? `bg-${colorClass}-900/10 border-${colorClass}-800/40`
          : 'bg-red-900/10 border-red-800/40'}`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isActive ? `bg-${colorClass}-500/20` : 'bg-red-500/20'}`}>
              {isActive
                ? <CheckCircle size={28} className={`text-${colorClass}-400`} />
                : <XCircle size={28} className="text-red-400" />
              }
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-bold text-white">{typeLabel} Lisenziya</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isActive
                  ? `bg-${colorClass}-500/20 text-${colorClass}-400`
                  : 'bg-red-500/20 text-red-400'}`}>
                  {isActive ? 'AKTİV' : license?.reason || 'SONA ERDİ'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-dark-500">Status</p>
                  <p className={`font-medium ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isActive ? 'Aktiv' : 'Deaktiv'}
                  </p>
                </div>
                <div>
                  <p className="text-dark-500">Növ</p>
                  <p className="text-white font-medium">{typeLabel}</p>
                </div>
                {licData.expiresAt && (
                  <div>
                    <p className="text-dark-500">Bitmə tarixi</p>
                    <p className="text-white font-medium">{new Date(licData.expiresAt).toLocaleDateString('az-AZ')}</p>
                  </div>
                )}
                {licData.daysLeft !== null && licData.daysLeft !== undefined && !isDemo && (
                  <div>
                    <p className="text-dark-500">Qalan gün</p>
                    <p className={`font-bold text-lg ${licData.daysLeft > 7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isLifetime ? '∞' : `${licData.daysLeft} gün`}
                    </p>
                  </div>
                )}
                {isDemo && licData.minutesLeft !== undefined && (
                  <div>
                    <p className="text-dark-500">Qalan vaxt</p>
                    <p className="font-bold text-lg text-amber-400">{licData.minutesLeft} dəqiqə</p>
                  </div>
                )}
                {licData.issuedAt && (
                  <div>
                    <p className="text-dark-500">Verilmə tarixi</p>
                    <p className="text-white font-medium">{new Date(licData.issuedAt).toLocaleDateString('az-AZ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Device ID */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={16} className="text-dark-400" />
            <h3 className="text-sm font-semibold text-white">Cihaz ID</h3>
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-dark-800 text-primary-400 px-4 py-2 rounded-xl text-sm font-mono select-all">
              {deviceId}
            </code>
            <button
              onClick={() => copyToClipboard(deviceId)}
              className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white rounded-lg transition-colors"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-xs text-dark-500 mt-2">Lisenziya açarı alarkən bu ID-ni bildirin</p>
        </div>

        {/* Activate License */}
        {isAdmin && (
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key size={16} className="text-primary-400" />
              <h3 className="text-sm font-semibold text-white">Lisenziya Aktivasiyası</h3>
            </div>
            <div className="flex gap-3">
              <textarea
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Lisenziya açarını yapışdırın..."
                rows={2}
                className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-4 py-2 text-sm font-mono text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 resize-none"
              />
              <button
                onClick={handleActivate}
                disabled={activating || !licenseKey.trim()}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 self-end"
              >
                {activating ? <Loader2 size={16} className="animate-spin" /> : 'Aktiv Et'}
              </button>
            </div>

            {isActive && (
              <button
                onClick={handleDeactivate}
                className="mt-4 flex items-center gap-2 text-red-400 hover:text-red-300 text-xs transition-colors"
              >
                <Trash2 size={12} />
                Lisenziyani sil
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
