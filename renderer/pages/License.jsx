import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, XCircle, Copy, Trash2, Loader2, Plus, Clock, Calendar, Infinity, Users, User } from 'lucide-react';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { apiBridge } from '../api/bridge';

export default function License() {
  const { showNotification, checkLicense, isAdmin, currentUser } = useApp();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  // Admin: generate states
  const [genDurationType, setGenDurationType] = useState('days');
  const [genDurationValue, setGenDurationValue] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  // All user licenses (admin view)
  const [allLicenses, setAllLicenses] = useState([]);

  // Users list for admin
  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (isAdmin) {
        const [licRes, usersRes] = await Promise.all([
          apiBridge.getAllUserLicenses(),
          apiBridge.getUsers?.() || Promise.resolve({ success: true, data: [] }),
        ]);
        if (licRes.success) setAllLicenses(licRes.data || []);
        if (usersRes.success) {
          const nonAdmins = (usersRes.data || []).filter(u => u.role_name !== 'admin' && u.username !== 'admin');
          setUsersList(nonAdmins);
        }
      }
    } catch (e) {
      showNotification('Yükləmə xətası: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedKey('');
    try {
      const targetUser = selectedUserId ? parseInt(selectedUserId) : null;
      const res = await apiBridge.generateUserLicense(genDurationType, genDurationValue, currentUser.id, targetUser, targetDeviceId.trim() || null);
      if (res.success) {
        setGeneratedKey(res.data.licenseKey);
        showNotification('Lisenziya yaradıldı!', 'success');
        await loadData();
      } else {
        showNotification(res.error || 'Yaratma uğursuz', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(licId) {
    try {
      const res = await apiBridge.revokeUserLicense(licId);
      if (res.success) {
        showNotification('Lisenziya ləğv edildi', 'success');
        await loadData();
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

  const durationOptions = [
    { value: 'minutes', label: 'Dəqiqə', icon: Clock },
    { value: 'hours', label: 'Saat', icon: Clock },
    { value: 'days', label: 'Gün', icon: Calendar },
    { value: 'months', label: 'Ay', icon: Calendar },
    { value: 'lifetime', label: 'Ömürlük', icon: Infinity },
  ];

  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400',
    expired: 'bg-red-500/20 text-red-400',
    revoked: 'bg-dark-600/30 text-dark-400',
    used: 'bg-amber-500/20 text-amber-400',
  };

  const statusLabels = {
    active: 'Aktiv',
    expired: 'Bitib',
    revoked: 'Ləğv',
    used: 'İstifadə olunub',
  };

  const typeLabels = {
    lifetime: 'Ömürlük',
    timed: 'Müddətli',
    trial: 'Sınaq',
  };

  return (
    <div className="min-h-full p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">İstifadəçi Lisenziyaları</h1>
            <p className="text-dark-400 text-sm">Hər istifadəçi üçün ayrıca lisenziya yarat və idarə et</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Generate License */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-dark-900 border border-primary-800/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Plus size={16} className="text-primary-400" />
                <h3 className="text-sm font-bold text-white">Lisenziya Yarat</h3>
              </div>

              {/* Target User */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-dark-400 mb-1.5">
                  <User size={12} className="inline mr-1" />
                  İstifadəçi (ixtiyari)
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50"
                >
                  <option value="">Heç kim (açar sonra verilsin)</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.username})</option>
                  ))}
                </select>
                <p className="text-[10px] text-dark-600 mt-1">Boş saxlasanız, açar hər hansı istifadəçiyə verilə bilər</p>
              </div>

              {/* Target Device ID */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-dark-400 mb-1.5">
                  <Key size={12} className="inline mr-1" />
                  Müştəri Cihaz ID (məcburi)
                </label>
                <input
                  type="text"
                  value={targetDeviceId}
                  onChange={(e) => setTargetDeviceId(e.target.value)}
                  placeholder="Müştərinin cihaz ID-sini yapışdırın..."
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm font-mono text-primary-400 focus:outline-none focus:border-primary-500/50 placeholder:text-dark-600"
                />
                <p className="text-[10px] text-dark-600 mt-1">Müştəri proqramda Cihaz ID-ni kopyalayıb sizə göndərməlidir. Key bu cihaza bağlanacaq.</p>
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
                  <div className="flex flex-wrap gap-2">
                    {(genDurationType === 'minutes' ? [10, 30, 60] :
                      genDurationType === 'hours' ? [1, 6, 12, 24] :
                      genDurationType === 'days' ? [1, 7, 14, 30] :
                      [1, 3, 6, 12]
                    ).map(v => (
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

              {/* Summary */}
              <div className="bg-dark-800/50 rounded-lg px-3 py-2 mb-4 text-xs">
                <span className="text-dark-500">Yaradılacaq: </span>
                <span className="text-white font-medium">
                  {genDurationType === 'lifetime' ? 'Ömürlük lisenziya' :
                    `${genDurationValue} ${durationOptions.find(o => o.value === genDurationType)?.label.toLowerCase()} müddətli lisenziya`}
                </span>
                {selectedUserId && (
                  <span className="text-primary-400"> → {usersList.find(u => u.id === parseInt(selectedUserId))?.full_name || 'İstifadəçi'}</span>
                )}
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !targetDeviceId.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-primary-500/10"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin inline mr-1" /> Yaradılır...</>
                ) : (
                  <><Plus size={14} className="inline mr-1" /> Lisenziya Yarat</>
                )}
              </button>

              {/* Generated key */}
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
                  <code className="block bg-dark-900 border border-dark-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-300 select-all break-all">{generatedKey}</code>
                  <p className="text-[10px] text-dark-500 mt-1.5">Bu açarı müştəriyə göndərin. Müştəri proqrama giriş edəndə bu açarı daxil edib aktiv edəcək.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: All Licenses */}
          <div className="lg:col-span-3">
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-dark-400" />
                <h3 className="text-sm font-bold text-white">Bütün Lisenziyalar</h3>
                <span className="text-[10px] bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full ml-auto">{allLicenses.length}</span>
              </div>

              {allLicenses.length === 0 ? (
                <p className="text-dark-500 text-sm text-center py-8">Hələ lisenziya yaradılmayıb</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {allLicenses.map(lic => (
                    <div key={lic.id} className="bg-dark-800/50 border border-dark-700/50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Key size={12} className="text-dark-500" />
                          <code className="text-xs font-mono text-primary-400 cursor-pointer hover:text-primary-300" onClick={() => copyToClipboard(lic.license_key)}>
                            {lic.license_key}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusColors[lic.status] || 'bg-dark-600 text-dark-400'}`}>
                            {statusLabels[lic.status] || lic.status}
                          </span>
                          {lic.status === 'active' && (
                            <button onClick={() => handleRevoke(lic.id)} className="text-dark-500 hover:text-red-400 transition-colors" title="Ləğv et">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-dark-500">
                        <span>
                          <User size={10} className="inline mr-0.5" />
                          {lic.user_full_name || lic.user_name || 'Təyin olunmayıb'}
                        </span>
                        <span>{typeLabels[lic.type] || lic.type}</span>
                        {lic.device_id && (
                          <span className="text-cyan-400/70 font-mono" title={lic.device_id}>
                            Cihaz: {lic.device_id.substring(0, 8)}...
                          </span>
                        )}
                        {lic.activated_at && (
                          <span className="text-dark-400">
                            Aktiv: {new Date(lic.activated_at).toLocaleDateString('az-AZ')}
                          </span>
                        )}
                        {lic.expires_at && (
                          <span className={new Date(lic.expires_at) < new Date() ? 'text-red-400' : ''}>
                            Bitmə: {new Date(lic.expires_at).toLocaleDateString('az-AZ')}
                          </span>
                        )}
                        {lic.type === 'lifetime' && <span className="text-emerald-400">∞ Ömürlük</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
