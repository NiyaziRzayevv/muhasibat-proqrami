import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, XCircle, Copy, Cpu, Trash2, Loader2, Plus, Clock, Calendar, Infinity } from 'lucide-react';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

export default function License() {
  const { showNotification, checkLicense, isAdmin } = useApp();
  const { t } = useLanguage();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');

  // Admin generate states
  const [genDeviceId, setGenDeviceId] = useState('');
  const [genDurationType, setGenDurationType] = useState('days');
  const [genDurationValue, setGenDurationValue] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  // Activate states
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);

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
    if (!licenseKey.trim()) return;
    setActivating(true);
    try {
      const res = await window.api.activateLicense(licenseKey.trim());
      if (res.success) {
        showNotification('Lisenziya aktivləşdirildi!', 'success');
        setLicenseKey('');
        await loadLicense();
        if (checkLicense) await checkLicense();
      } else {
        showNotification(res.error || 'Aktivasiya uğursuz', 'error');
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
        showNotification('Lisenziya silindi', 'success');
        await loadLicense();
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    }
  }

  async function handleGenerate() {
    if (!genDeviceId.trim()) {
      showNotification('Device ID daxil edin', 'error');
      return;
    }
    setGenerating(true);
    setGeneratedKey('');
    try {
      const res = await window.api.generateLicense(genDeviceId.trim(), genDurationType, genDurationValue);
      if (res.success) {
        setGeneratedKey(res.data.licenseKey);
        showNotification('Lisenziya yaradıldı!', 'success');
      } else {
        showNotification(res.error || 'Yaratma uğursuz', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setGenerating(false);
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
  const typeLabel = isLifetime ? 'Ömürlük' : isDemo ? 'Demo' : isTimed ? 'Müddətli' : 'Yoxdur';

  const durationOptions = [
    { value: 'minutes', label: 'Dəqiqə', icon: Clock },
    { value: 'hours', label: 'Saat', icon: Clock },
    { value: 'days', label: 'Gün', icon: Calendar },
    { value: 'months', label: 'Ay', icon: Calendar },
    { value: 'lifetime', label: 'Ömürlük', icon: Infinity },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Lisenziya İdarəsi</h1>
            <p className="text-dark-400 text-sm">Lisenziya yarat, aktiv et və idarə et</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            {/* Current License Status */}
            <div className={`rounded-2xl border p-5 ${isActive ? 'bg-emerald-900/5 border-emerald-800/30' : 'bg-red-900/5 border-red-800/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                {isActive ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
                <h3 className="font-semibold text-white">Cari Lisenziya</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isActive ? 'AKTİV' : 'YOX'}
                </span>
              </div>
              {isActive && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-dark-500 text-xs">Növ</p>
                    <p className="text-white font-medium">{typeLabel}</p>
                  </div>
                  {licData.expiresAt && (
                    <div>
                      <p className="text-dark-500 text-xs">Bitmə</p>
                      <p className="text-white font-medium">{new Date(licData.expiresAt).toLocaleDateString('az-AZ')}</p>
                    </div>
                  )}
                  {isLifetime && (
                    <div>
                      <p className="text-dark-500 text-xs">Müddət</p>
                      <p className="text-emerald-400 font-bold">∞ Ömürlük</p>
                    </div>
                  )}
                  {licData.daysLeft != null && !isLifetime && !isDemo && (
                    <div>
                      <p className="text-dark-500 text-xs">Qalan</p>
                      <p className={`font-bold ${licData.daysLeft > 7 ? 'text-emerald-400' : 'text-amber-400'}`}>{licData.daysLeft} gün</p>
                    </div>
                  )}
                  {licData.issuedAt && (
                    <div>
                      <p className="text-dark-500 text-xs">Verilmə</p>
                      <p className="text-dark-300">{new Date(licData.issuedAt).toLocaleDateString('az-AZ')}</p>
                    </div>
                  )}
                </div>
              )}
              {!isActive && <p className="text-dark-500 text-sm">{license?.reason || 'Lisenziya tapılmadı'}</p>}
              {isActive && (
                <button onClick={handleDeactivate} className="mt-3 flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors">
                  <Trash2 size={11} /> Lisenziyani sil
                </button>
              )}
            </div>

            {/* Device ID */}
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} className="text-dark-400" />
                <h3 className="text-sm font-semibold text-white">Bu cihazın ID-si</h3>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-dark-800 text-primary-400 px-3 py-2 rounded-lg text-xs font-mono select-all truncate">{deviceId}</code>
                <button onClick={() => copyToClipboard(deviceId)} className="p-2 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white rounded-lg transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Activate existing key */}
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Key size={14} className="text-primary-400" />
                <h3 className="text-sm font-semibold text-white">Lisenziya Aktiv Et</h3>
              </div>
              <textarea
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Lisenziya açarını yapışdırın..."
                rows={2}
                className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50 resize-none mb-3"
              />
              <button
                onClick={handleActivate}
                disabled={activating || !licenseKey.trim()}
                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {activating ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                Aktiv Et
              </button>
            </div>
          </div>

          {/* Right column - Admin Generate */}
          {isAdmin && (
            <div className="space-y-5">
              <div className="bg-dark-900 border border-primary-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Plus size={16} className="text-primary-400" />
                  <h3 className="text-sm font-bold text-white">Lisenziya Yarat (Admin)</h3>
                </div>

                {/* Target Device ID */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Müştəri Device ID</label>
                  <input
                    type="text"
                    value={genDeviceId}
                    onChange={(e) => setGenDeviceId(e.target.value.toUpperCase())}
                    placeholder="Müştərinin cihaz ID-sini daxil edin"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/50"
                  />
                </div>

                {/* Duration Type */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">Müddət tipi</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {durationOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setGenDurationType(opt.value)}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-medium border transition-all ${
                          genDurationType === opt.value
                            ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                            : 'bg-dark-800 border-dark-700 text-dark-500 hover:text-white hover:border-dark-600'
                        }`}
                      >
                        <opt.icon size={14} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Value */}
                {genDurationType !== 'lifetime' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-dark-400 mb-1.5">
                      Miqdar ({durationOptions.find(o => o.value === genDurationType)?.label})
                    </label>
                    <div className="flex gap-2">
                      {[
                        genDurationType === 'minutes' ? [10, 30, 60] :
                        genDurationType === 'hours' ? [1, 6, 12, 24] :
                        genDurationType === 'days' ? [1, 7, 14, 30] :
                        [1, 3, 6, 12]
                      ][0].map(v => (
                        <button
                          key={v}
                          onClick={() => setGenDurationValue(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            genDurationValue === v
                              ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                              : 'bg-dark-800 border-dark-700 text-dark-500 hover:text-white'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        value={genDurationValue}
                        onChange={(e) => setGenDurationValue(parseInt(e.target.value) || 1)}
                        className="w-20 bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>
                )}

                {/* Generate summary */}
                <div className="bg-dark-800/50 rounded-lg px-3 py-2 mb-4 text-xs">
                  <span className="text-dark-500">Yaradılacaq: </span>
                  <span className="text-white font-medium">
                    {genDurationType === 'lifetime' ? 'Ömürlük lisenziya' :
                      `${genDurationValue} ${durationOptions.find(o => o.value === genDurationType)?.label.toLowerCase()} müddətli lisenziya`}
                  </span>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating || !genDeviceId.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-primary-500/10"
                >
                  {generating ? (
                    <><Loader2 size={14} className="animate-spin inline mr-1" /> Yaradılır...</>
                  ) : (
                    <><Plus size={14} className="inline mr-1" /> Lisenziya Yarat</>
                  )}
                </button>

                {/* Generated key output */}
                {generatedKey && (
                  <div className="mt-4 bg-emerald-900/10 border border-emerald-800/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-emerald-400">Lisenziya açarı yaradıldı!</span>
                      <button
                        onClick={() => copyToClipboard(generatedKey)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Copy size={12} /> Kopyala
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={generatedKey}
                      rows={3}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-3 py-2 text-[10px] font-mono text-emerald-300 resize-none select-all"
                    />
                    <p className="text-[10px] text-dark-500 mt-1.5">Bu açarı müştəriyə göndərin. Müştəri proqrama daxil olduqda bu açarı yapışdırıb aktiv edəcək.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
