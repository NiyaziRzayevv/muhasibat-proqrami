import React, { useState, useEffect } from 'react';
import { Key, Copy, CheckCircle, Clock, Shield, AlertTriangle, Loader2, Monitor } from 'lucide-react';

export default function LicenseActivation({ onActivated }) {
  const [deviceId, setDeviceId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    loadDeviceId();
  }, []);

  async function loadDeviceId() {
    try {
      const res = await window.api.getDeviceId();
      if (res.success) setDeviceId(res.data);
    } catch (e) {
      console.error('Device ID error:', e);
    }
  }

  function copyDeviceId() {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleActivate(e) {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Lisenziya açarını daxil edin');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await window.api.activateLicense(licenseKey.trim());
      if (res.success) {
        setSuccess('Lisenziya uğurla aktivləşdirildi!');
        setTimeout(() => onActivated?.(), 1000);
      } else {
        setError(res.error || 'Aktivasiya uğursuz oldu');
      }
    } catch (e) {
      setError('Xəta: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    setError('');
    try {
      const res = await window.api.activateDemo();
      if (res.success) {
        setSuccess('Demo rejim aktivdir (10 dəqiqə)');
        setTimeout(() => onActivated?.(), 800);
      } else {
        setError(res.error || 'Demo aktivasiya uğursuz');
      }
    } catch (e) {
      setError('Xəta: ' + e.message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-lg shadow-primary-500/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SmartQeyd</h1>
          <p className="text-dark-400 text-sm mt-1">Lisenziya Aktivasiyası</p>
        </div>

        {/* Card */}
        <div className="bg-dark-900/80 backdrop-blur border border-dark-800/60 rounded-2xl p-6 shadow-2xl">
          {/* Device ID */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
              <Monitor size={14} />
              Cihaz ID
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2.5 text-sm font-mono text-primary-400 select-all overflow-x-auto">
                {deviceId || '...'}
              </div>
              <button
                onClick={copyDeviceId}
                className={`shrink-0 p-2.5 rounded-lg border transition-all ${
                  copied
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-dark-800/60 border-dark-700/50 text-dark-400 hover:text-white hover:border-dark-600'
                }`}
                title="Kopyala"
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-dark-500 mt-1.5">
              Bu ID-ni admin-ə göndərin lisenziya açarı almaq üçün
            </p>
          </div>

          {/* License Key Input */}
          <form onSubmit={handleActivate}>
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-dark-300 mb-2">
                <Key size={14} />
                Lisenziya Açarı
              </label>
              <textarea
                value={licenseKey}
                onChange={(e) => { setLicenseKey(e.target.value); setError(''); }}
                placeholder="Lisenziya açarını bura yapışdırın..."
                rows={3}
                className="w-full bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm mb-4 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                <CheckCircle size={14} className="shrink-0" />
                {success}
              </div>
            )}

            {/* Activate Button */}
            <button
              type="submit"
              disabled={loading || !licenseKey.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-sm hover:from-primary-500 hover:to-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Aktivləşdirilir...</>
              ) : (
                <><Key size={16} /> Lisenziyani Aktiv Et</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-dark-800" />
            <span className="text-dark-500 text-xs">və ya</span>
            <div className="flex-1 h-px bg-dark-800" />
          </div>

          {/* Demo Button */}
          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dark-700/60 text-dark-300 text-sm hover:bg-dark-800/50 hover:text-white transition-all disabled:opacity-50"
          >
            {demoLoading ? (
              <><Loader2 size={14} className="animate-spin" /> Demo yüklənir...</>
            ) : (
              <><Clock size={14} /> Demo istifadə et (10 dəqiqə)</>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-dark-600 mt-6">
          v1.3.0 · SmartQeyd Sistemi
        </p>
      </div>
    </div>
  );
}
