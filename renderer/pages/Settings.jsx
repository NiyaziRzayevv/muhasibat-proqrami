import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, Loader2, Database, Download,
  Upload, Eye, EyeOff, RefreshCw, FolderOpen, CheckCircle, AlertTriangle,
  FileText, Terminal, Send
} from 'lucide-react';
import { useApp } from '../App';
import ConfirmDialog from '../components/ConfirmDialog';
import { apiRequest } from '../api/http';
import { useLanguage } from '../contexts/LanguageContext';

function UpdateSection() {
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState(null); // { status, version, percent, error }
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (window.api?.getAppVersion) {
      window.api.getAppVersion().then(r => { if (r.success) setVersion(r.data?.version || ''); });
    }
    if (window.api?.onUpdaterStatus) {
      const unsub = window.api.onUpdaterStatus((data) => {
        setStatus(data);
        if (data.status !== 'checking') setChecking(false);
      });
      return unsub;
    }
  }, []);

  async function handleCheck() {
    if (!window.api?.checkForUpdate) return;
    setChecking(true);
    setStatus(null);
    try {
      await window.api.checkForUpdate();
    } catch { setChecking(false); }
  }

  async function handleDownload() {
    if (window.api?.downloadUpdate) await window.api.downloadUpdate();
  }

  function handleInstall() {
    if (window.api?.installUpdate) window.api.installUpdate();
  }

  const statusText = {
    checking: 'Yeniləmə yoxlanılır...',
    available: `Yeni versiya mövcuddur: v${status?.version || ''}`,
    'up-to-date': 'Proqram ən son versiyadadır ✓',
    downloading: `Yüklənir... ${status?.percent || 0}%`,
    downloaded: `v${status?.version || ''} yükləndi — quraşdırmağa hazırdır`,
    error: `Xəta: ${status?.error || 'Bilinməyən xəta'}`,
  };

  if (!window.api?.checkForUpdate) {
    return <p className="text-xs text-dark-500">Yeniləmə yoxlaması yalnız desktop proqramında mövcuddur.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-sm text-dark-300">Cari versiya: <span className="text-white font-semibold">v{version || '?'}</span></p>
      </div>

      {status && (
        <div className={`p-3 rounded-lg text-xs ${
          status.status === 'error' ? 'bg-red-900/20 text-red-400 border border-red-800/30' :
          status.status === 'up-to-date' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/30' :
          status.status === 'downloaded' ? 'bg-blue-900/20 text-blue-400 border border-blue-800/30' :
          'bg-dark-700/50 text-dark-300'
        }`}>
          <p>{statusText[status.status] || status.status}</p>
          {status.status === 'downloading' && (
            <div className="mt-2 h-1.5 bg-dark-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${status.percent || 0}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={handleCheck} disabled={checking || status?.status === 'downloading'}
          className="btn-secondary text-xs py-1.5">
          {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Yeniləmə yoxla
        </button>

        {status?.status === 'available' && (
          <button onClick={handleDownload} className="btn-primary text-xs py-1.5">
            <Download size={13} /> Yüklə
          </button>
        )}

        {status?.status === 'downloaded' && (
          <button onClick={handleInstall} className="btn-primary text-xs py-1.5">
            <CheckCircle size={13} /> İndi yenilə
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { showNotification, refreshSettings, setTheme, setCurrency, isAdmin } = useApp();
  const { t, lang, changeLang, languageNames } = useLanguage();
  const [form, setForm] = useState({
    company_name: '', master_name: '', phone: '', address: '',
    currency: 'AZN', theme: 'dark', openai_api_key: '',
    backup_path: '', use_ai_parser: 'true',
    telegram_bot_token: '', telegram_chat_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [logPath, setLogPath] = useState('');

  useEffect(() => {
    loadSettings();
    loadDbPath();
    loadBackups();
    if (window.api?.getLogPath) {
      window.api.getLogPath().then(r => { if (r.success && r.data) setLogPath(r.data); });
    }
  }, []);

  async function loadSettings() {
    try {
      if (window.api?.getSettings) {
        const res = await window.api.getSettings();
        if (res.success) setForm(f => ({ ...f, ...res.data }));
        return;
      }
      const token = localStorage.getItem('auth_token') || '';
      const res = await apiRequest('/settings', { token });
      if (res.success) setForm(f => ({ ...f, ...res.data }));
    } catch (e) { console.error(e); }
  }

  async function loadDbPath() {
    try {
      if (!window.api?.getDbPath) { setDbPath('Remote server rejimi'); return; }
      const res = await window.api.getDbPath();
      if (res.success) setDbPath(res.data);
    } catch (e) { }
  }

  async function loadBackups() {
    setBackupsLoading(true);
    try {
      if (!window.api?.listBackups) { setBackupsLoading(false); return; }
      const res = await window.api.listBackups();
      if (res.success) setBackups(res.data);
    } catch (e) { console.error(e); }
    finally { setBackupsLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let result;
      if (window.api?.saveSettings) {
        result = await window.api.saveSettings(form);
      } else {
        const token = localStorage.getItem('auth_token') || '';
        result = await apiRequest('/settings', { method: 'PUT', token, body: form });
      }
      if (result.success) {
        showNotification('Ayarlar yadda saxlandı', 'success');
        setTheme(form.theme);
        try { await refreshSettings(); } catch {}
      } else {
        showNotification(result.error || 'Xəta', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleCreateBackup() {
    setCreatingBackup(true);
    try {
      if (window.api?.createBackup) {
        const result = await window.api.createBackup(form.backup_path || null);
        if (result.success) {
          showNotification('Backup uğurla yaradıldı', 'success');
          window.api?.showItemInFolder?.(result.path);
          await loadBackups();
        } else {
          showNotification(result.error || 'Backup yaradıla bilmədi', 'error');
        }
        return;
      }

      const token = localStorage.getItem('auth_token') || '';
      const res = await apiRequest('/backup/export', { token });
      if (!res.success) {
        showNotification(res.error || 'Backup yaradıla bilmədi', 'error');
        return;
      }

      const content = JSON.stringify(res.data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartqeyd-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification('Backup uğurla endirildi', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setCreatingBackup(false); }
  }

  async function handleSelectBackupPath() {
    try {
      if (!window.api?.openFolderDialog) return;
      const folder = await window.api.openFolderDialog();
      if (folder) setForm(f => ({ ...f, backup_path: folder }));
    } catch (e) { }
  }

  async function handleRestoreBackup() {
    if (!restoreConfirm) return;
    setRestoring(true);
    try {
      if (!window.api?.restoreBackup) {
        showNotification('Browser rejimində backup bərpası hələlik dəstəklənmir', 'error');
        setRestoring(false); return;
      }
      const result = await window.api.restoreBackup(restoreConfirm);
      if (result.success) {
        showNotification('Backup bərpa edildi. Proqramı yenidən başladın.', 'success');
        setRestoreConfirm(null);
      } else {
        showNotification(result.error || 'Bərpa uğursuz oldu', 'error');
      }
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setRestoring(false); }
  }

  async function handleImportBackup() {
    try {
      if (!window.api?.openFileDialog) {
        showNotification('Browser rejimində backup bərpası hələlik dəstəklənmir', 'error');
        return;
      }
      const file = await window.api.openFileDialog({ filters: [{ name: 'Database', extensions: ['db'] }] });
      if (file) setRestoreConfirm(file);
    } catch (e) { }
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function handleTestTelegram() {
    if (!form.telegram_bot_token || !form.telegram_chat_id) {
      showNotification('Bot Token və Chat ID daxil edin', 'error');
      return;
    }
    setSendingTest(true);
    // Müvəqqəti olaraq save edək ki, backend oxuya bilsin (və ya birbaşa göndərək)
    // Backend getSetting() ilə oxuyur, ona görə save etmək lazımdır.
    try {
      if (window.api?.saveSettings && window.api?.sendTelegramMessage) {
        await window.api.saveSettings(form);
        const res = await window.api.sendTelegramMessage('🔔 Test mesajı: SmartQeyd Telegram İnteqrasiyası işləyir!');
        if (res.success) showNotification('Mesaj göndərildi!', 'success');
        else showNotification('Xəta: ' + res.error, 'error');
      } else {
        const token = localStorage.getItem('auth_token') || '';
        await apiRequest('/settings', { method: 'PUT', token, body: form });
        const res = await apiRequest('/settings/telegram/test', {
          method: 'POST',
          token,
          body: {
            telegram_bot_token: form.telegram_bot_token,
            telegram_chat_id: form.telegram_chat_id,
            message: '🔔 Test mesajı: SmartQeyd Telegram İnteqrasiyası işləyir!'
          }
        });
        if (res.success) showNotification('Mesaj göndərildi!', 'success');
        else showNotification('Xəta: ' + res.error, 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ayarlar</h1>
          <p className="text-sm text-dark-400 mt-0.5">Proqram konfiqrasiyası</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Yadda saxla
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            <SettingsIcon size={13} className="text-primary-400" /> Servis Məlumatları
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Şirkət / Servis adı</label>
              <input className="input-field" placeholder="SmartQeyd" value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Usta / Sahibin adı</label>
              <input className="input-field" placeholder="Adınız" value={form.master_name}
                onChange={e => setForm(f => ({ ...f, master_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="input-field" placeholder="050-123-4567" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ünvan</label>
              <input className="input-field" placeholder="Bakı, Azərbaycan" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('appearance')}</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">{t('language')}</label>
              <div className="flex gap-2">
                {['az', 'ru', 'en'].map(code => (
                  <button
                    key={code}
                    onClick={() => changeLang(code)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      lang === code
                        ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                        : 'bg-dark-800 border-dark-700 text-dark-400 hover:border-dark-600 hover:text-white'
                    }`}
                  >
                    <span className="block text-center">{languageNames[code]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t('darkMode')}</label>
              <select className="select-field" value={form.theme} onChange={e => {
                const v = e.target.value;
                setForm(f => ({ ...f, theme: v }));
                setTheme(v);
              }}>
                <option value="dark">{t('darkMode')}</option>
                <option value="light">{t('lightMode')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('currency')}</label>
              <select className="select-field" value={form.currency} onChange={e => {
                const v = e.target.value;
                setForm(f => ({ ...f, currency: v }));
                setCurrency(v);
              }}>
                <option value="AZN">AZN (₼)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>

        {isAdmin && <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            AI Parser Ayarları
            <span className="px-2 py-0.5 text-xs bg-purple-900/30 text-purple-400 border border-purple-700/30 rounded-full">OpenAI</span>
          </p>
          <div>
            <label className="label">OpenAI API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="sk-..."
                value={form.openai_api_key}
                onChange={e => setForm(f => ({ ...f, openai_api_key: e.target.value }))}
              />
              <button onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-dark-500 mt-1">
              AI parser yalnız qaydabazalı sistem əmin olmayanda istifadə olunur.
              Key olmazsa, yalnız yerli parser işləyir. platform.openai.com saytından alın.
            </p>
          </div>
          <div>
            <label className="label">AI Parseri aktiv et</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, use_ai_parser: f.use_ai_parser === 'true' ? 'false' : 'true' }))}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200
                  ${form.use_ai_parser === 'true' ? 'bg-primary-600' : 'bg-dark-600'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200
                  ${form.use_ai_parser === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-dark-300">{form.use_ai_parser === 'true' ? 'Aktiv' : 'Deaktiv'}</span>
            </div>
          </div>
        </div>}

        {isAdmin && <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            <Database size={13} className="text-primary-400" /> Verilənlər Bazası
          </p>
          {dbPath && (
            <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
              <Database size={14} className="text-dark-400 shrink-0" />
              <code className="text-xs text-dark-300 break-all flex-1">{dbPath}</code>
              <button onClick={() => window.api?.showItemInFolder?.(dbPath)} className="btn-icon w-7 h-7 shrink-0" title="Qovluğu aç">
                <FolderOpen size={13} />
              </button>
            </div>
          )}
        </div>}

        {isAdmin && <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            <Send size={13} className="text-primary-400" /> Telegram İnteqrasiyası
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Telegram Bot Token</label>
              <input 
                type="password"
                className="input-field" 
                placeholder="123456:ABC-..." 
                value={form.telegram_bot_token}
                onChange={e => setForm(f => ({ ...f, telegram_bot_token: e.target.value }))} 
              />
            </div>
            <div>
              <label className="label">Chat ID</label>
              <div className="flex gap-2">
                <input 
                  className="input-field flex-1" 
                  placeholder="-100..." 
                  value={form.telegram_chat_id}
                  onChange={e => setForm(f => ({ ...f, telegram_chat_id: e.target.value }))} 
                />
                <button 
                  onClick={handleTestTelegram} 
                  disabled={sendingTest} 
                  className="btn-secondary shrink-0"
                  title="Test mesajı göndər"
                >
                  {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-dark-500">
            Bot tokeni @BotFather-dan, Chat ID-ni isə qrupa botu əlavə edib mesaj yazaraq öyrənə bilərsiniz.
          </p>
        </div>}

        {isAdmin && <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <Download size={13} className="text-primary-400" /> Backup
            </p>
            <button onClick={loadBackups} disabled={backupsLoading} className="text-dark-400 hover:text-white">
              <RefreshCw size={13} className={backupsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div>
            <label className="label">Backup qovluğu (boş buraxılsa Sənədlər\ServisBackup)</label>
            <div className="flex gap-2">
              <input className="input-field flex-1" placeholder="C:\Users\...\ServisBackup" value={form.backup_path}
                onChange={e => setForm(f => ({ ...f, backup_path: e.target.value }))} />
              <button onClick={handleSelectBackupPath} className="btn-secondary shrink-0">
                <FolderOpen size={14} />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCreateBackup} disabled={creatingBackup} className="btn-primary">
              {creatingBackup ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Backup yarat
            </button>
            <button onClick={handleImportBackup} className="btn-secondary">
              <Upload size={14} /> Backup bərpa et
            </button>
          </div>

          {backups.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-dark-500">Son backuplar:</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {backups.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors">
                    <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-dark-200 truncate">{b.filename}</p>
                      <p className="text-xs text-dark-500">{fmtSize(b.size)} · {new Date(b.created).toLocaleString('az-AZ')}</p>
                    </div>
                    <button onClick={() => setRestoreConfirm(b.path)}
                      className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-dark-600 shrink-0 transition-colors">
                      Bərpa et
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>}

        {isAdmin && <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            <Download size={13} className="text-primary-400" /> Proqram Yeniləməsi
          </p>
          <UpdateSection />
        </div>}

        {isAdmin && <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal size={13} className="text-primary-400" /> Sistem Logları
          </p>
          <p className="text-xs text-dark-500">
            Bütün əməliyyatlar, xətalər və parser nəticələri log faylına yazılır.
          </p>
          {logPath && (
            <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
              <FileText size={14} className="text-dark-400 shrink-0" />
              <code className="text-xs text-dark-300 break-all flex-1">{logPath}</code>
              <button onClick={() => window.api?.openLogFolder?.()}
                className="btn-icon w-7 h-7 shrink-0" title="Qovluğu aç">
                <FolderOpen size={13} />
              </button>
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => window.api?.openLogFolder?.()} className="btn-secondary text-xs py-1.5">
              <FolderOpen size={13} /> Log qovluğunu aç
            </button>
            <button onClick={() => logPath && window.api?.openPath?.(logPath)} disabled={!logPath}
              className="btn-secondary text-xs py-1.5">
              <FileText size={13} /> Log faylını aç
            </button>
          </div>
          <div className="text-xs text-dark-600 space-y-0.5">
            <p>Loqlanan əməliyyatlar: <span className="text-dark-400">RAW_INPUT · PARSED_RESULT · DB_INSERT · TOTAL_RECALCULATED · ERROR_LOG · STOCK · MIGRATION</span></p>
            <p>Maksimum fayl həcmi: <span className="text-dark-400">5 MB (avtomatik arxivləşir)</span></p>
          </div>
        </div>}

        <div className="h-4" />
      </div>

      <ConfirmDialog
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={handleRestoreBackup}
        title="Backup Bərpa Et"
        message="Mövcud baza bu backup ilə əvəz olunacaq. Cari məlumatlar silinəcək. Davam etmək istəyirsiniz?"
        confirmText="Bərpa et"
        loading={restoring}
      />
    </div>
  );
}
