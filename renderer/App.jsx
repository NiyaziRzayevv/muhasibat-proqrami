import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import UniversalSmartInput from './components/UniversalSmartInput';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Customers from './pages/Customers';
import Vehicles from './pages/Vehicles';
import PriceBase from './pages/PriceBase';
import Reports from './pages/Reports';
import ExportPage from './pages/Export';
import Settings from './pages/Settings';
import Debts from './pages/Debts';
import NewRecord from './pages/NewRecord';
import Products from './pages/Products';
import StockMovements from './pages/StockMovements';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import Suppliers from './pages/Suppliers';
import CustomerHistory from './pages/CustomerHistory';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import POS from './pages/POS';
import Finance from './pages/Finance';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
import Notifications from './pages/Notifications';
import License from './pages/License';
import Appointments from './pages/Appointments';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Assets from './pages/Assets';
import UserWorkspace from './pages/UserWorkspace';
import NoAccess from './pages/NoAccess';
import { apiBridge } from './api/bridge';
import { LanguageProvider } from './contexts/LanguageContext';

export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export default function App() {
  const [settings, setSettings] = useState({});
  const [theme, setTheme] = useState('dark');
  const [currency, setCurrency] = useState('AZN');
  const [notification, setNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userAccess, setUserAccess] = useState(null);
  const [licenseOk, setLicenseOk] = useState(true);
  const smartInputRef = useRef(null);

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role_name === 'admin' || currentUser.username === 'admin') {
        setLicenseOk(true);
      } else {
        checkLicense();
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const res = await apiBridge.verifyToken(token);
        if (res.success) {
          setCurrentUser(res.data);
          await checkAccess(res.data);
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setAuthChecked(true);
    }
  }

  const checkAccess = useCallback(async (user) => {
    if (!user) return;
    if (user.role_name === 'admin' || user.username === 'admin') {
      setUserAccess({ hasAccess: true, accessType: 'lifetime' });
      return;
    }
    try {
      const res = await apiBridge.checkUserAccess(user.id);
      if (res.success) setUserAccess(res.data);
    } catch (e) { console.error('Access check error:', e); }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role_name === 'admin' || currentUser.username === 'admin') return;
    const interval = setInterval(() => {
      checkAccess(currentUser);
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser, checkAccess]);

  async function checkLicense() {
    try {
      const res = await apiBridge.getLicenseStatus();
      if (res.success) {
        setLicenseOk(!res.data.expired);
      }
    } catch (e) {
      console.error('License check error:', e);
    }
  }

  async function loadSettings() {
    try {
      if (!window.api?.getSettings) return;
      const res = await window.api.getSettings();
      if (res.success) {
        setSettings(res.data);
        setTheme(res.data.theme || 'dark');
        setCurrency(res.data.currency || 'AZN');
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
  }

  async function loadUnreadCount() {
    try {
      if (!window.api?.getUnreadCount) return;
      const res = await window.api.getUnreadCount(currentUser?.id);
      if (res.success) setUnreadCount(res.data || 0);
    } catch (e) { /* ignore */ }
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3500);
  }

  async function refreshSettings() {
    await loadSettings();
  }

  async function handleLogin(user) {
    setCurrentUser(user);
    await checkAccess(user);
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) await apiBridge.logout(token);
    } catch (e) { /* ignore */ }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setUserAccess(null);
  }

  const userPermissions = useCallback(() => {
    if (!currentUser) return {};
    try { return JSON.parse(currentUser.role_permissions || '{}'); }
    catch { return {}; }
  }, [currentUser]);

  const isAdmin = currentUser?.role_name === 'admin' || currentUser?.username === 'admin';
  const accessKnown = !!currentUser && (isAdmin || userAccess !== null);
  const hasSystemAccess = isAdmin || (userAccess?.hasAccess === true);

  const ctx = {
    settings, showNotification, refreshSettings, theme, setTheme, currency, setCurrency, smartInputRef,
    currentUser, handleLogout, unreadCount, setUnreadCount, loadUnreadCount, isAdmin,
    userAccess, checkAccess, hasSystemAccess, checkLicense,
    hasPermission: (perm) => {
      if (!currentUser) return false;
      if (currentUser.role_name === 'admin') return true;
      try { return !!JSON.parse(currentUser.role_permissions || '{}')[perm]; }
      catch { return false; }
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LanguageProvider>
        <AppContext.Provider value={ctx}>
          <Login onLogin={handleLogin} />
        </AppContext.Provider>
      </LanguageProvider>
    );
  }

  if (!accessKnown) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasSystemAccess) {
    return (
      <LanguageProvider>
        <AppContext.Provider value={ctx}>
          <NoAccess />
        </AppContext.Provider>
      </LanguageProvider>
    );
  }

  if (!licenseOk && !isAdmin) {
    return (
      <LanguageProvider>
        <AppContext.Provider value={ctx}>
          <div className="min-h-screen bg-dark-950 flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 bg-red-900/30 border-b border-red-800/40">
              <div className="flex items-center gap-2 text-red-300 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Lisenziya müddəti bitib. Proqramı istifadə etmək üçün lisenziya açarı daxil edin.
              </div>
              <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-800/40 hover:bg-red-900/30">
                Çıxış
              </button>
            </div>
            <div className="flex-1">
              <License />
            </div>
          </div>
        </AppContext.Provider>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <AppContext.Provider value={ctx}>
        <HashRouter>
          <AppLayout
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            notification={notification}
            smartInputRef={smartInputRef}
          />
        </HashRouter>
      </AppContext.Provider>
    </LanguageProvider>
  );
}

function AppLayout({ sidebarCollapsed, setSidebarCollapsed, notification, smartInputRef }) {
  const navigate = useNavigate();
  const { isAdmin } = useApp();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        smartInputRef?.current?.focus();
        document.querySelector('[data-smart-input]')?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/new-record');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, smartInputRef]);

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global AI Smart Input Bar - Only for Admin */}
        {isAdmin && (
          <div className="shrink-0 bg-dark-900 border-b border-dark-800 px-4 py-2.5">
            <UniversalSmartInput
              compact={true}
              onDone={(page) => { if (page) navigate(`/${page}`); }}
            />
          </div>
        )}

        <main className="flex-1 overflow-hidden bg-dark-900">
          <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/workspace" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/new-record" element={<ErrorBoundary><NewRecord /></ErrorBoundary>} />
              <Route path="/records" element={<ErrorBoundary><Records /></ErrorBoundary>} />
              <Route path="/customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
              <Route path="/vehicles" element={<ErrorBoundary><Vehicles /></ErrorBoundary>} />
              <Route path="/price-base" element={<ErrorBoundary><PriceBase /></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="/debts" element={<ErrorBoundary><Debts /></ErrorBoundary>} />
              <Route path="/export" element={<ErrorBoundary><ExportPage /></ErrorBoundary>} />
              <Route path="/products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
              <Route path="/stock-movements" element={<ErrorBoundary><StockMovements /></ErrorBoundary>} />
              <Route path="/sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
              <Route path="/sales/new" element={<ErrorBoundary><NewSale /></ErrorBoundary>} />
              <Route path="/suppliers" element={<ErrorBoundary><Suppliers /></ErrorBoundary>} />
              <Route path="/customer-history" element={<ErrorBoundary><CustomerHistory /></ErrorBoundary>} />
              <Route path="/pos" element={<ErrorBoundary><POS /></ErrorBoundary>} />
              <Route path="/finance" element={<ErrorBoundary><Finance /></ErrorBoundary>} />
              <Route path="/expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
              <Route path="/notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
              <Route path="/appointments" element={<ErrorBoundary><Appointments /></ErrorBoundary>} />
              <Route path="/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
              <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
              <Route path="/assets" element={<ErrorBoundary><Assets /></ErrorBoundary>} />
              {/* Admin-only pages */}
              <Route path="/users" element={isAdmin ? <ErrorBoundary><Users /></ErrorBoundary> : <Navigate to="/dashboard" replace />} />
              <Route path="/audit-log" element={isAdmin ? <ErrorBoundary><AuditLog /></ErrorBoundary> : <Navigate to="/dashboard" replace />} />
              <Route path="/license" element={isAdmin ? <ErrorBoundary><License /></ErrorBoundary> : <Navigate to="/dashboard" replace />} />
              <Route path="/settings" element={isAdmin ? <ErrorBoundary><Settings /></ErrorBoundary> : <Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          {notification && (
            <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-fade-in
              ${notification.type === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100' :
                notification.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
                'bg-dark-700 border-dark-600 text-white'}`}
            >
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          )}
        </div>
      </div>
  );
}
