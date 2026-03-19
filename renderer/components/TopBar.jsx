import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, Settings, LogOut } from 'lucide-react';
import { useApp } from '../App';

export default function TopBar() {
  const { currentUser, unreadCount, handleLogout } = useApp();
  const navigate = useNavigate();
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function doLogout() {
    await handleLogout();
    navigate('/');
  }

  const initials = (currentUser?.full_name || currentUser?.username || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="shrink-0 h-14 bg-dark-950 border-b border-dark-800/50 flex items-center px-5 relative">
      {/* Left spacer */}
      <div className="flex-1" />

      {/* Center Brand */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 select-none">
        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Smart</span>
        <span className="text-xl font-black tracking-tight text-white">Qeyd</span>
      </div>

      {/* Right: Clock + Notification + User */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Live Clock */}
        <div className="flex items-center gap-2 bg-dark-800/60 border border-dark-700/50 rounded-xl px-3.5 py-1.5">
          <Clock size={13} className="text-primary-400" />
          <span className="font-mono text-sm font-semibold text-white tracking-wider">
            {liveTime.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Date */}
        <div className="hidden lg:flex items-center text-xs text-dark-400">
          {liveTime.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-xl bg-dark-800/60 border border-dark-700/50 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none min-w-[18px] min-h-[18px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl bg-dark-800/60 border border-dark-700/50 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <Settings size={16} />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary-500/20">
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}
