import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Table2, Users, Boxes,
  Tag, BarChart3, CreditCard, Download, Settings,
  ChevronLeft, ChevronRight, Package,
  ShoppingCart, Truck, ArrowLeftRight, Building2, History,
  Monitor, DollarSign, TrendingDown, Shield, Activity,
  Bell, Key, LogOut, User, Calendar, CheckSquare, BarChart2, Bot
} from 'lucide-react';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

function buildAdminNav(unreadCount, t) {
  return [
    {
      label: t('sidebarMain'),
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { to: '/new-record', icon: PlusCircle, label: t('addNew') },
        { to: '/records', icon: Table2, label: t('recordsPage') },
      ]
    },
    {
      label: t('sidebarSales'),
      items: [
        { to: '/pos', icon: Monitor, label: t('posKassa') },
        { to: '/sales', icon: ShoppingCart, label: t('salesPage') },
        { to: '/products', icon: Package, label: t('products') },
        { to: '/stock-movements', icon: ArrowLeftRight, label: t('stock') },
        { to: '/suppliers', icon: Truck, label: t('suppliers') },
      ]
    },
    {
      label: t('sidebarCustomers'),
      items: [
        { to: '/customers', icon: Users, label: t('customers') },
        { to: '/customer-history', icon: History, label: t('history') },
        { to: '/vehicles', icon: Boxes, label: t('vehicles') || 'Əşyalar' },
        { to: '/debts', icon: CreditCard, label: t('debts') },
      ]
    },
    {
      label: t('sidebarFinance'),
      items: [
        { to: '/finance', icon: DollarSign, label: t('finance') },
        { to: '/expenses', icon: TrendingDown, label: t('expenses') },
        { to: '/assets', icon: Building2, label: t('assets') || 'Aktivlər' },
        { to: '/price-base', icon: Tag, label: t('prices') },
      ]
    },
    {
      label: t('sidebarReports'),
      items: [
        { to: '/reports', icon: BarChart3, label: t('reports') },
        { to: '/analytics', icon: BarChart2, label: t('analytics') },
        { to: '/export', icon: Download, label: t('exportPage') },
      ]
    },
    {
      label: t('sidebarManagement'),
      items: [
        { to: '/appointments', icon: Calendar, label: t('appointments') },
        { to: '/tasks', icon: CheckSquare, label: t('tasks') },
        { to: '/ai-assistant', icon: Bot, label: 'AI Köməkçi' },
      ]
    },
    {
      label: t('sidebarSystem'),
      items: [
        { to: '/notifications', icon: Bell, label: t('notifications'), badge: unreadCount > 0 ? unreadCount : null },
        { to: '/users', icon: Shield, label: t('users') },
        { to: '/audit-log', icon: Activity, label: t('auditLog') },
        { to: '/license', icon: Key, label: t('license') },
        { to: '/settings', icon: Settings, label: t('settings') },
      ]
    },
  ];
}

function buildUserNav(unreadCount, t) {
  return [
    {
      label: t('sidebarMain'),
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { to: '/new-record', icon: PlusCircle, label: t('addNew') },
        { to: '/records', icon: Table2, label: t('recordsPage') },
      ]
    },
    {
      label: t('sidebarSales'),
      items: [
        { to: '/pos', icon: Monitor, label: t('posKassa') },
        { to: '/sales', icon: ShoppingCart, label: t('salesPage') },
        { to: '/products', icon: Package, label: t('products') },
        { to: '/stock-movements', icon: ArrowLeftRight, label: t('stock') },
        { to: '/suppliers', icon: Truck, label: t('suppliers') },
      ]
    },
    {
      label: t('sidebarCustomers'),
      items: [
        { to: '/customers', icon: Users, label: t('customers') },
        { to: '/customer-history', icon: History, label: t('history') },
        { to: '/vehicles', icon: Boxes, label: t('vehicles') || 'Əşyalar' },
        { to: '/debts', icon: CreditCard, label: t('debts') },
      ]
    },
    {
      label: t('sidebarFinance'),
      items: [
        { to: '/finance', icon: DollarSign, label: t('finance') },
        { to: '/expenses', icon: TrendingDown, label: t('expenses') },
        { to: '/assets', icon: Building2, label: t('assets') || 'Aktivlər' },
        { to: '/price-base', icon: Tag, label: t('prices') },
      ]
    },
    {
      label: t('sidebarReports'),
      items: [
        { to: '/reports', icon: BarChart3, label: t('reports') },
        { to: '/analytics', icon: BarChart2, label: t('analytics') },
        { to: '/export', icon: Download, label: t('exportPage') },
      ]
    },
    {
      label: t('sidebarManagement'),
      items: [
        { to: '/appointments', icon: Calendar, label: t('appointments') },
        { to: '/tasks', icon: CheckSquare, label: t('tasks') },
        { to: '/ai-assistant', icon: Bot, label: 'AI Köməkçi' },
        { to: '/notifications', icon: Bell, label: t('notifications'), badge: unreadCount > 0 ? unreadCount : null },
      ]
    },
  ];
}

function buildNav(unreadCount, isAdmin, t) {
  return isAdmin ? buildAdminNav(unreadCount, t) : buildUserNav(unreadCount, t);
}

export default function Sidebar({ collapsed, onToggle }) {
  const { settings, currentUser, handleLogout, unreadCount } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role_name === 'admin';
  const NAV_SECTIONS = buildNav(unreadCount, isAdmin, t);

  async function doLogout() {
    await handleLogout();
    navigate('/');
  }

  return (
    <aside className={`flex flex-col bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 border-r border-dark-800/50 transition-all duration-300 shrink-0 shadow-2xl
      ${collapsed ? 'w-[72px]' : 'w-64'}`}
    >
      {/* Logo Header */}
      <div className="flex flex-col items-center py-4 border-b border-dark-800/50 px-3 shrink-0 bg-dark-900/50">
        {!collapsed ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 select-none">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Smart</span>
              <span className="text-lg font-black tracking-tight text-white">Qeyd</span>
            </div>
            <p className="text-[9px] text-dark-500 mt-0.5">v1.4.6</p>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-lg font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">S</span>
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
