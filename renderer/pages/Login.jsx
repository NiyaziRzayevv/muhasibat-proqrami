import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Lock, User, AlertCircle, UserPlus, Phone, Mail, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { apiBridge } from '../api/bridge';

export default function Login({ onLogin, onPending }) {
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
      setError('İstifadəçi adı və şifrəni daxil edin');
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
      } else if (res.isPending) {
        setMode('pending');
      } else {
        setError(res.message || res.error || 'Giriş uğursuz oldu');
      }
    } catch (e) {
      setError('Giriş xətası: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      setError('İstifadəçi adı, ad soyad və şifrə tələb olunur');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir');
      return;
    }
    if (password.length < 6) {
      setError('Şifrə minimum 6 simvol olmalıdır');
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
        setMode('pending');
        setSuccess('Qeydiyyat uğurlu oldu! Admin təsdiqi gözləyin.');
      } else {
        setError(res.error || 'Qeydiyyat uğursuz oldu');
      }
    } catch (e) {
      setError('Qeydiyyat xətası: ' + e.message);
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

  // Pending approval screen
  if (mode === 'pending') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Təsdiq Gözlənilir</h1>
          <p className="text-dark-400 mb-6">
            Qeydiyyatınız uğurla tamamlandı. Admin tərəfindən təsdiqlənməsini gözləyin.
            Təsdiqləndikdən sonra sistemə daxil ola bilərsiniz.
          </p>
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-primary-900/40 rounded-full flex items-center justify-center shrink-0">
                <User size={18} className="text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-white">{fullName || username}</p>
                <p className="text-xs text-dark-400">@{username}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setMode('login'); resetForm(); }}
            className="flex items-center justify-center gap-2 text-primary-400 hover:text-primary-300 transition-colors mx-auto"
          >
            <ArrowLeft size={16} /> Giriş səhifəsinə qayıt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-dark-950 overflow-y-auto p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="./logo.png" alt="SmartQeyd" className="h-48 w-auto object-contain mb-4" />
          <p className="text-dark-400 text-sm mt-1">Ağıllı Biznes İdarəetmə Sistemi</p>
        </div>

        {/* Card */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">
          <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-dark-300">Server</span>
              <label className="flex items-center gap-2 text-xs text-dark-400 select-none">
                <input
                  type="checkbox"
                  checked={remoteEnabled}
                  onChange={(e) => updateRemoteConfig(e.target.checked, serverUrl)}
                  className="accent-primary-600"
                />
                Mərkəzi server
              </label>
            </div>
            {remoteEnabled && (
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => {
                const v = e.target.value;
                setServerUrl(v);
                apiBridge.setRemoteConfig({ enabled: remoteEnabled, baseUrl: v });
              }}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
              placeholder="http://SERVER-IP:3001"
            />
            )}
            {!remoteEnabled && window.api && (
              <p className="text-xs text-dark-500">Lokal rejim — məlumatlar bu kompüterdə saxlanılır</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex bg-dark-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <LogIn size={16} /> Giriş
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <UserPlus size={16} /> Qeydiyyat
            </button>
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'forgot' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'
              }`}
            >
              <Lock size={16} /> Parolu unutdum
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
                <label className="block text-sm font-medium text-dark-300 mb-2">İstifadəçi adı</label>
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
                <label className="block text-sm font-medium text-dark-300 mb-2">Şifrə</label>
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
                    Daxil ol
                  </>
                )}
              </button>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Ad Soyad *</label>
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
                <label className="block text-sm font-medium text-dark-300 mb-2">İstifadəçi adı *</label>
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
                  <label className="block text-sm font-medium text-dark-300 mb-2">Telefon</label>
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
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
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
                <label className="block text-sm font-medium text-dark-300 mb-2">Şifrə *</label>
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
                <label className="block text-sm font-medium text-dark-300 mb-2">Şifrə təkrarı *</label>
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
                    Qeydiyyatdan keç
                  </>
                )}
              </button>

              <p className="text-xs text-dark-500 text-center mt-3">
                Qeydiyyatdan sonra admin tərəfindən təsdiqlənməlisiniz
              </p>
            </form>
          ) : (
            // Forgot Password form
            <form onSubmit={resetToken ? handleResetPassword : handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">İstifadəçi adı *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    placeholder="İstifadəçi adınız"
                    autoFocus
                  />
                </div>
              </div>

              {!resetToken ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">Telefon</label>
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
                      <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
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
                        Şifrə sıfırlama kodu al
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">Yeni şifrə *</label>
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
                    <label className="block text-sm font-medium text-dark-300 mb-2">Şifrə təkrarı *</label>
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
                        Şifrəni dəyişdir
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
          PRO v3.0.0 · SmartQeyd Sistemi
        </p>
      </div>
    </div>
  );
}
