import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, loading }) {
  const { t } = useLanguage();
  const colorMap = {
    blue: { bg: 'bg-primary-900/30', border: 'border-primary-800/40', icon: 'text-primary-400', value: 'text-primary-300' },
    green: { bg: 'bg-emerald-900/30', border: 'border-emerald-800/40', icon: 'text-emerald-400', value: 'text-emerald-300' },
    amber: { bg: 'bg-amber-900/30', border: 'border-amber-800/40', icon: 'text-amber-400', value: 'text-amber-300' },
    red: { bg: 'bg-red-900/30', border: 'border-red-800/40', icon: 'text-red-400', value: 'text-red-300' },
    purple: { bg: 'bg-purple-900/30', border: 'border-purple-800/40', icon: 'text-purple-400', value: 'text-purple-300' },
    cyan: { bg: 'bg-cyan-900/30', border: 'border-cyan-800/40', icon: 'text-cyan-400', value: 'text-cyan-300' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`card p-5 flex flex-col gap-3 border ${c.border} ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-7 w-24 bg-dark-700 rounded animate-pulse" />
          ) : (
            <p className={`text-2xl font-bold ${c.value}`}>{value ?? '—'}</p>
          )}
        </div>
        {Icon && (
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-dark-800 ${c.icon}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-dark-400">{subtitle}</p>
      )}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{Math.abs(trend)}% {t('smartComparedPrev')}</span>
        </div>
      )}
    </div>
  );
}
