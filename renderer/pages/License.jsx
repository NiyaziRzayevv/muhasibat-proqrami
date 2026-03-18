import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, XCircle, Clock, Copy, RefreshCw, Cpu, AlertTriangle } from 'lucide-react';
import { useApp } from '../App';
import { apiBridge } from '../api/bridge';
import { apiRequest } from '../api/http';
import { useLanguage } from '../contexts/LanguageContext';

export default function License() {
  const { showNotification, checkLicense, isAdmin } = useApp();
  const { t } = useLanguage();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [machineId, setMachineId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    loadLicense();
  }, []);

  async function loadLicense() {
    setLoading(true);
    try {
      const licRes = await apiBridge.getLicenseStatus();
      if (licRes.success) setLicense(licRes.data);
      if (window.api?.getMachineId) {
        const machRes = await window.api.getMachineId();
        if (machRes.success) setMachineId(machRes.data);
      } else {
        setMachineId('Browser rejimi — cihaz ID yoxdur');
      }
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
      let res;
      if (window.api?.activateLicense) {
        res = await window.api.activateLicense(licenseKey.trim().toUpperCase());
      } else {
        const token = localStorage.getItem('auth_token') || '';
        res = await apiRequest('/licenses/activate', { method: 'POST', token, body: { license_key: licenseKey.trim().toUpperCase(), machine_id: machineId } });
      }
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

  async function handleGenerateKey() {
    try {
      if (window.api?.generateLicenseKey) {
        const res = await window.api.generateLicenseKey();
        if (res.success) setGeneratedKey(res.data);
        else showNotification(res.error || 'Xəta', 'error');
        return;
      }

      const token = localStorage.getItem('auth_token') || '';
      const res = await apiRequest('/licenses/admin/generate-key', { method: 'POST', token, body: {} });
      if (res.success) setGeneratedKey(res.data);
      else showNotification(res.error || 'Xəta', 'error');
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

  const isActive = license?.valid && !license?.expired;
  const isPro = license?.type === 'pro';
  const isTrial = license?.type === 'trial';

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
          ? isPro
            ? 'bg-emerald-900/10 border-emerald-800/40'
            : 'bg-amber-900/10 border-amber-800/40'
          : 'bg-red-900/10 border-red-800/40'}`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isActive ? isPro ? 'bg-emerald-500/20' : 'bg-amber-500/20' : 'bg-red-500/20'}`}>
              {isActive
                ? isPro ? <CheckCircle size={28} className="text-emerald-400" />
                        : <Clock size={28} className="text-amber-400" />
                : <XCircle size={28} className="text-red-400" />
              }
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-bold text-white">
                  {isPro ? 'PRO Lisenziya' : isTrial ? 'Trial Rejimi' : 'Lisenziya Yoxdur'}
                </h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isActive
                  ? isPro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'}`}>
                  {isActive ? 'AKTİV' : 'SONA ERDİ'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-dark-500">Status</p>
                  <p className={`font-medium ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isActive ? 'Aktiv' : 'Bitib'}
                  </p>
                </div>
                <div>
                  <p className="text-dark-500">Növ</p>
                  <p className="text-white font-medium">{isPro ? 'PRO' : 'Trial (Sınaq)'}</p>
                </div>
                {license?.expiresAt && (
                  <div>
                    <p className="text-dark-500">Bitmə tarixi</p>
                    <p className="text-white font-medium">{license.expiresAt}</p>
                  </div>
                )}
                <div>
                  <p className="text-dark-500">Qalan gün</p>
                  <p className={`font-bold text-lg ${license?.daysLeft > 7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {license?.daysLeft || 0} gün
                  </p>
                </div>
              </div>

              {isTrial && isActive && license?.daysLeft <= 7 && (
                <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle size={14} />
                  <span>Trial müddəti bitmək üzrədir. Lisenziya açarı daxil edin.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Machine ID */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={16} className="text-dark-400" />
            <h3 className="text-sm font-semibold text-white">Cihaz ID</h3>
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-dark-800 text-primary-400 px-4 py-2 rounded-xl text-sm font-mono">
              {machineId}
            </code>
            <button
              onClick={() => copyToClipboard(machineId)}
              className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white rounded-lg transition-colors"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-xs text-dark-500 mt-2">Lisenziya açarı alarkən bu ID-ni bildirin</p>
        </div>

        {/* Activate */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-primary-400" />
            <h3 className="text-sm font-semibold text-white">Lisenziya Aktivasiyası</h3>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value.toUpperCase())}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all uppercase"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              maxLength={23}
            />
            <button
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-primary-500/20"
            >
              {activating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield size={18} />
                  Aktivasiya et
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Key Generator (Admin only) */}
        {isAdmin && (
        <div className="bg-dark-900/50 border border-dark-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-dark-500" />
              <h3 className="text-sm font-semibold text-dark-400">Demo Açar Generator (Admin)</h3>
            </div>
            <button
              onClick={handleGenerateKey}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Yeni açar yarat
            </button>
          </div>
          {generatedKey && (
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-dark-800 text-emerald-400 px-4 py-2 rounded-xl text-sm font-mono">
                {generatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white rounded-lg transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
          )}
          <p className="text-xs text-dark-600 mt-2">Bu açar demo/test üçündür</p>
        </div>
        )}
      </div>
    </div>
  );
}
