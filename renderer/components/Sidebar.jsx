import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Table2, Users, Boxes,
  Tag, BarChart3, CreditCard, Download, Settings,
  ChevronLeft, ChevronRight, Package,
  ShoppingCart, Truck, ArrowLeftRight, Building2, History,
  Monitor, DollarSign, TrendingDown, Shield, Activity,
  Bell, Key, LogOut, User, Calendar, CheckSquare, BarChart2
} from 'lucide-react';
import { useApp } from '../App';

// Admin üçün tam menü
function buildAdminNav(unreadCount) {
  return [
    {
      label: 'Əsas',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/new-record', icon: PlusCircle, label: 'Əlavə et' },
        { to: '/records', icon: Table2, label: 'Qeydlər' },
      ]
    },
    {
      label: 'Satış',
      items: [
        { to: '/pos', icon: Monitor, label: 'POS / Kassa' },
        { to: '/sales', icon: ShoppingCart, label: 'Satışlar' },
        { to: '/products', icon: Package, label: 'Məhsullar' },
        { to: '/stock-movements', icon: ArrowLeftRight, label: 'Stok' },
        { to: '/suppliers', icon: Truck, label: 'Təchizatçılar' },
      ]
    },
    {
      label: 'Müştərilər',
      items: [
        { to: '/customers', icon: Users, label: 'Müştərilər' },
        { to: '/customer-history', icon: History, label: 'Tarixçə' },
        { to: '/vehicles', icon: Boxes, label: 'Aktivlər' },
        { to: '/debts', icon: CreditCard, label: 'Borclar' },
      ]
    },
    {
      label: 'Maliyyə',
      items: [
        { to: '/finance', icon: DollarSign, label: 'Maliyyə' },
        { to: '/expenses', icon: TrendingDown, label: 'Xərclər' },
        { to: '/price-base', icon: Tag, label: 'Qiymətlər' },
      ]
    },
    {
      label: 'Hesabat',
      items: [
        { to: '/reports', icon: BarChart3, label: 'Hesabatlar' },
        { to: '/analytics', icon: BarChart2, label: 'Analitika' },
        { to: '/export', icon: Download, label: 'Export' },
      ]
    },
    {
      label: 'İdarəetmə',
      items: [
        { to: '/appointments', icon: Calendar, label: 'Randevular' },
        { to: '/tasks', icon: CheckSquare, label: 'Tapşırıqlar' },
      ]
    },
    {
      label: 'Sistem',
      items: [
        { to: '/notifications', icon: Bell, label: 'Bildirişlər', badge: unreadCount > 0 ? unreadCount : null },
        { to: '/users', icon: Shield, label: 'İstifadəçilər' },
        { to: '/audit-log', icon: Activity, label: 'Audit Log' },
        { to: '/license', icon: Key, label: 'Lisenziya' },
        { to: '/settings', icon: Settings, label: 'Ayarlar' },
      ]
    },
  ];
}

// Adi istifadəçi üçün tam mühasibat menüsü (Admin bölmələri olmadan)
function buildUserNav(unreadCount) {
  return [
    {
      label: 'Əsas',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/new-record', icon: PlusCircle, label: 'Əlavə et' },
        { to: '/records', icon: Table2, label: 'Qeydlər' },
      ]
    },
    {
      label: 'Satış',
      items: [
        { to: '/pos', icon: Monitor, label: 'POS / Kassa' },
        { to: '/sales', icon: ShoppingCart, label: 'Satışlar' },
        { to: '/products', icon: Package, label: 'Məhsullar' },
        { to: '/stock-movements', icon: ArrowLeftRight, label: 'Stok' },
        { to: '/suppliers', icon: Truck, label: 'Təchizatçılar' },
      ]
    },
    {
      label: 'Müştərilər',
      items: [
        { to: '/customers', icon: Users, label: 'Müştərilər' },
        { to: '/customer-history', icon: History, label: 'Tarixçə' },
        { to: '/vehicles', icon: Boxes, label: 'Aktivlər' },
        { to: '/debts', icon: CreditCard, label: 'Borclar' },
      ]
    },
    {
      label: 'Maliyyə',
      items: [
        { to: '/finance', icon: DollarSign, label: 'Maliyyə' },
        { to: '/expenses', icon: TrendingDown, label: 'Xərclər' },
        { to: '/price-base', icon: Tag, label: 'Qiymətlər' },
      ]
    },
    {
      label: 'Hesabat',
      items: [
        { to: '/reports', icon: BarChart3, label: 'Hesabatlar' },
        { to: '/analytics', icon: BarChart2, label: 'Analitika' },
        { to: '/export', icon: Download, label: 'Export' },
      ]
    },
    {
      label: 'İdarəetmə',
      items: [
        { to: '/appointments', icon: Calendar, label: 'Randevular' },
        { to: '/tasks', icon: CheckSquare, label: 'Tapşırıqlar' },
        { to: '/notifications', icon: Bell, label: 'Bildirişlər', badge: unreadCount > 0 ? unreadCount : null },
      ]
    },
  ];
}

function buildNav(unreadCount, isAdmin) {
  return isAdmin ? buildAdminNav(unreadCount) : buildUserNav(unreadCount);
}

export default function Sidebar({ collapsed, onToggle }) {
  const { settings, currentUser, handleLogout, unreadCount } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role_name === 'admin';
  const NAV_SECTIONS = buildNav(unreadCount, isAdmin);

  async function doLogout() {
    await handleLogout();
    navigate('/');
  }

  return (
    <aside className={`flex flex-col bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 border-r border-dark-800/50 transition-all duration-300 shrink-0 shadow-2xl
      ${collapsed ? 'w-[72px]' : 'w-64'}`}
    >
      {/* Logo Header */}
      <div className="flex flex-col items-center py-3 border-b border-dark-800/50 px-3 shrink-0 bg-dark-900/50">
        <div className="relative flex items-center justify-center shrink-0 overflow-hidden">
          <img src="./logo.png" alt="logo" className="w-[200px] h-auto object-contain" />
        </div>
        {!collapsed && (
          <div className="text-center mt-1">
            <p className="text-[10px] text-primary-400/80 font-medium">PRO v3.0</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-6 h-6 rounded-lg bg-dark-800/50 hover:bg-dark-700 text-dark-400 hover:text-white transition-all duration-200 shrink-0"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar px-2">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="mb-2">
            {!collapsed && (
              <p className="text-[9px] font-bold text-dark-600 uppercase tracking-widest px-3 py-1.5">
                {section.label}
              </p>
            )}
            {collapsed && si > 0 && <div className="mx-2 my-2 border-t border-dark-800/30" />}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-150 relative
                      ${isActive
                        ? 'bg-primary-600/15 text-primary-400'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800/60'
                      }
                      ${collapsed ? 'justify-center' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-r-full" />
                        )}
                        <div className={`relative flex items-center justify-center w-7 h-7 rounded-lg transition-all shrink-0
                          ${isActive ? 'bg-primary-500/20' : 'group-hover:bg-dark-700/50'}`}>
                          <Icon size={15} className={isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-white'} />
                          {item.badge && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="truncate text-[12px] flex-1">{item.label}</span>
                        )}
                        {!collapsed && item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-dark-800/50 p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center font-bold text-sm text-primary-400 flex-shrink-0">
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.full_name || currentUser?.username}</p>
              <p className="text-[10px] text-dark-500 truncate">{currentUser?.role_display || currentUser?.role_name}</p>
            </div>
            <button onClick={doLogout} title="Çıxış"
              className="w-7 h-7 rounded-lg hover:bg-red-900/30 text-dark-500 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center font-bold text-sm text-primary-400">
              {(currentUser?.full_name || currentUser?.username || 'U')[0].toUpperCase()}
            </div>
            <button onClick={doLogout} title="Çıxış"
              className="w-7 h-7 rounded-lg hover:bg-red-900/30 text-dark-500 hover:text-red-400 flex items-center justify-center transition-colors">
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
