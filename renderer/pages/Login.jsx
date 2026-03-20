import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Lock, User, AlertCircle, UserPlus, Phone, Mail, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import UpdateNotification from '../components/UpdateNotification';
import { apiBridge } from '../api/bridge';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login({ onLogin, onPending }) {
  const { t, lang, changeLang } = useLanguage();
  const initialRemote = apiBridge.getRemoteConfig();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'pending', 'forgot'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [remoteEnabled, setRemoteEnabled] = useState(!!initialRemote.enabled);
  const [serverUrl, setServerUrl] = useState(initialRemote.baseUrl || '');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  function updateRemoteConfig(nextEnabled, nextUrl) {
    setRemoteEnabled(nextEnabled);
    setServerUrl(nextUrl);
    apiBridge.setRemoteConfig({ enabled: nextEnabled, baseUrl: nextUrl });
  }

  function resetForm() {
    setUsername(''); setPassword(''); setConfirmPassword('');
    setFullName(''); setPhone(''); setEmail('');
    setError(''); setSuccess('');
    setResetToken(''); setNewPassword(''); setConfirmNewPassword('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('enterUsernamePassword'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiBridge.login(username.trim(), password);
      if (res.success) {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('auth_user', JSON.stringify(res.data));
        onLogin(res.data);
      } else {
        setError(res.message || res.error || t('loginFailed'));
      }
    } catch (e) {
      setError(t('loginError') + ': ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setError(t('requiredFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiBridge.register({
        username: username.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      if (res.success) {
        setSuccess(t('registerSuccess'));
        setMode('login');
      } else {
        setError(res.error || t('registerFailed'));
      }
    } catch (e) {
      setError(t('registerError') + ': ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!username.trim()) {
      setError('İstifadəçi adı daxil edin');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError('Telefon və ya email daxil edin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiBridge.requestPasswordReset(username.trim(), phone.trim(), email.trim());
      if (res.success) {
        setResetToken(res.data.resetToken);
        setSuccess('Şifrə sıfırlama kodu hazırlandı. Yeni şifrəni daxil edin.');
      } else {
        setError(res.error || 'Şifrə sıfırlama uğursuz oldu');
      }
    } catch (e) {
      setError('Şifrə sıfırlama xətası: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Yeni şifrəni daxil edin');
      return;
    }
    if (newPassword.length < 6) {
      setError('Şifrə minimum 6 simvol olmalıdır');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Şifrələr uyğun gəlmir');
      return;
    }
    if (!resetToken) {
      setError('Şifrə sıfırlama kodu yoxdur');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiBridge.resetPassword(resetToken, newPassword);
      if (res.success) {
        setSuccess('Şifrə uğurla dəyişdirildi! Giriş edə bilərsiniz.');
        setTimeout(() => {
          setMode('login');
          resetForm();
        }, 2000);
      } else {
        setError(res.error || 'Şifrə dəyişdirilmədi');
      }
    } catch (e) {
      setError('Şifrə dəyişdirmə xətası: ' + e.message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="h-screen bg-dark-950 overflow-y-auto p-4">
      <UpdateNotification />
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 mt-6">
          <img src="./smart.png" alt="SmartQeyd" className="h-20 w-auto object-contain mb-3" />
          <div className="flex items-center gap-2 select-none">
            <span className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Smart</span>
            <span className="text-4xl font-black tracking-tight text-white">Qeyd</span>
          </div>
          <p className="text-dark-500 text-xs mt-2 tracking-widest uppercase font-medium">Smart Business Management</p>
          {/* Language Switcher */}
          <div className="flex gap-2 mt-3">
            {['az', 'ru', 'en'].map(code => (
              <button
                key={code}
                onClick={() => changeLang(code)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  lang === code
                    ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-500 hover:text-white hover:border-dark-600'
                }`}
              >
                {code === 'az' ? 'AZ' : code === 'ru' ? 'RU' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-dark-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <LogIn size={16} /> {t('loginButton')}
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <UserPlus size={16} /> {t('registerButton')}
            </button>
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'forgot' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <Lock size={16} /> {t('forgotPassword')}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('username')}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder="admin"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-primary-500/20 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    {t('loginButton')}
                  </>
                )}
              </button>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('fullName')} *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder="Elvin Məmmədov"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('username')} *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder="elvin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">{t('phone')}</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                      placeholder="050-XXX-XX-XX"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">{t('email')}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                      placeholder="email@mail.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('password')} *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder="Minimum 6 simvol"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('confirmPassword')} *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`w-full bg-dark-800 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:ring-1 transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-dark-700 focus:border-primary-500 focus:ring-primary-500/30'
                    }`}
                    placeholder="Şifrəni təkrar daxil edin"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    {t('registerButton')}
                  </>
                )}
              </button>

              <p className="text-xs text-dark-500 text-center mt-3">
                Qeydiyyatdan sonra lisenziya kodu tələb olunacaq
              </p>
            </form>
          ) : (
            // Forgot Password form
            <form onSubmit={resetToken ? handleResetPassword : handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('username')} *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder={t('username')}
                    autoFocus
                  />
                </div>
              </div>

              {!resetToken ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">{t('phone')}</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                          placeholder="050-XXX-XX-XX"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">{t('email')}</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                          placeholder="email@mail.com"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 mt-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock size={18} />
                        {t('sendResetCode')}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">{t('newPassword')} *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                        placeholder="Minimum 6 simvol"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">{t('confirmNewPassword')} *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        className={`w-full bg-dark-800 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:ring-1 transition-all ${
                          confirmNewPassword && confirmNewPassword !== newPassword
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                            : 'border-dark-700 focus:border-primary-500 focus:ring-primary-500/30'
                        }`}
                        placeholder="Şifrəni təkrar daxil edin"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-green-500/20 mt-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        {t('resetPassword')}
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {mode === 'login' && (
            <div className="mt-6 pt-5 border-t border-dark-800">
              <p className="text-xs text-dark-500 text-center">
                Default: <span className="text-dark-400 font-mono">admin</span> / <span className="text-dark-400 font-mono">admin123</span>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-dark-600 mt-6">
          v1.5.5 · SmartQeyd Sistemi
        </p>
      </div>
    </div>
  );
}
