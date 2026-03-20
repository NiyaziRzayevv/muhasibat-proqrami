import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, User, ShoppingCart, CreditCard, Package, BarChart3,
  TrendingDown, CheckSquare, DollarSign, LayoutDashboard, HelpCircle,
  AlertCircle, Sparkles, Loader2, Trash2, ChevronDown, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

const ICON_MAP = {
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  'package': Package,
  'bar-chart': BarChart3,
  'trending-up': BarChart3,
  'trending-down': TrendingDown,
  'check-square': CheckSquare,
  'dollar-sign': DollarSign,
  'layout-dashboard': LayoutDashboard,
  'help-circle': HelpCircle,
  'alert-circle': AlertCircle,
  'calendar': CheckSquare,
  'users': User,
  'building': Package,
  'truck': Package,
  'sparkles': Sparkles,
  'check-circle': CheckCircle,
};

const TYPE_COLORS = {
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  error: 'border-red-500/30 bg-red-500/5',
  info: 'border-primary-500/30 bg-primary-500/5',
};

const TYPE_ICON_COLORS = {
  success: 'text-emerald-400 bg-emerald-500/15',
  warning: 'text-amber-400 bg-amber-500/15',
  error: 'text-red-400 bg-red-500/15',
  info: 'text-primary-400 bg-primary-500/15',
};

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\n/g, '<br/>');
}

function StatCards({ stats }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div className={`grid gap-2 mt-3 ${stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {stats.map((s, i) => (
        <div key={i} className="bg-dark-800/60 border border-dark-700/50 rounded-xl px-3 py-2.5 text-center">
          <p className="text-[10px] text-dark-400 uppercase tracking-wide">{s.label}</p>
          <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function ListItems({ list }) {
  if (!list || list.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
      {list.map((item, i) => (
        <div key={i} className="flex items-center justify-between bg-dark-800/40 border border-dark-700/30 rounded-lg px-3 py-2">
          <span className="text-xs text-dark-200 truncate flex-1">{item.title}</span>
          <span className="text-xs text-dark-400 font-mono ml-2 shrink-0">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function AIMessage({ msg }) {
  const Icon = ICON_MAP[msg.icon] || Bot;
  const colorClass = TYPE_COLORS[msg.type] || TYPE_COLORS.info;
  const iconColorClass = TYPE_ICON_COLORS[msg.type] || TYPE_ICON_COLORS.info;

  return (
    <div className="flex gap-3 items-start">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColorClass}`}>
        <Bot size={16} />
      </div>
      <div className={`flex-1 border rounded-2xl rounded-tl-md px-4 py-3 ${colorClass}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} className={iconColorClass.split(' ')[0]} />
          <span className="text-[10px] text-dark-500 uppercase tracking-wide font-medium">
            {msg.intent ? msg.intent.replace(/_/g, ' ') : 'cavab'}
          </span>
        </div>
        <div
          className="text-sm text-dark-200 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
        />
        <StatCards stats={msg.stats} />
        <ListItems list={msg.list} />
        <p className="text-[10px] text-dark-600 mt-2">
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function UserMessage({ text, time }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="bg-primary-600/20 border border-primary-500/30 rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
        <p className="text-sm text-white">{text}</p>
        <p className="text-[10px] text-dark-500 mt-1 text-right">
          {new Date(time).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0">
        <User size={16} className="text-primary-400" />
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const { currentUser } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadQuickActions();
    // Başlanğıc mesajı
    setMessages([{
      role: 'ai',
      text: 'Salam! Mən **SmartQeyd AI köməkçisiyəm**. Istənilən sualınızı cavablandıra və proqramda əməliyyatlar icra edə bilərəm.\n\nMəsələn: "müştəri əlavə et", "bugünkü satışlar", "məhsul axtar" və ya istənilən sualınızı yazın.',
      type: 'info',
      icon: 'help-circle',
      intent: 'welcome',
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadQuickActions() {
    try {
      if (!window.api?.aiQuickActions) return;
      const res = await window.api.aiQuickActions();
      if (res.success) setQuickActions(res.data || []);
    } catch {}
  }

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = { role: 'user', text: text.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      console.log('[AI] window.api exists:', !!window.api, 'aiChat exists:', typeof window.api?.aiChat);
      const chatHistory = messages.filter(m => m.role === 'user' || m.role === 'ai').slice(-10);
      const res = await window.api.aiChat(text.trim(), currentUser?.id, chatHistory);
      if (res.success && res.data) {
        setMessages(prev => [...prev, { role: 'ai', ...res.data }]);
        if (res.data.action?.navigate) {
          setTimeout(() => navigate(res.data.action.navigate), 2000);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: res.error || 'Sorğunu emal edərkən xəta baş verdi.',
          type: 'error',
          icon: 'alert-circle',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'ai', text: 'Xəta: ' + e.message, type: 'error', icon: 'alert-circle',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, currentUser]);

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleClear() {
    setMessages([{
      role: 'ai',
      text: 'Söhbət silindi. Yeni sual verə bilərsiniz.',
      type: 'info',
      icon: 'help-circle',
      intent: 'welcome',
      timestamp: new Date().toISOString(),
    }]);
  }

  const QUICK_ICONS = {
    'shopping-cart': ShoppingCart,
    'credit-card': CreditCard,
    'package': Package,
    'bar-chart': BarChart3,
    'trending-down': TrendingDown,
    'check-square': CheckSquare,
    'dollar-sign': DollarSign,
    'layout-dashboard': LayoutDashboard,
  };

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Header */}
      <div className="shrink-0 border-b border-dark-800/50 bg-dark-900/80 backdrop-blur-sm px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 border border-primary-500/30 flex items-center justify-center">
              <Sparkles size={20} className="text-primary-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">SmartQeyd AI</h1>
              <p className="text-[11px] text-dark-400">Ağıllı biznes köməkçisi · Offline</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800/60 hover:bg-dark-700 text-dark-400 hover:text-white text-xs transition-colors"
          >
            <Trash2 size={13} /> Təmizlə
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 px-5 py-3 border-b border-dark-800/30 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {quickActions.map(qa => {
            const QIcon = QUICK_ICONS[qa.icon] || HelpCircle;
            return (
              <button
                key={qa.id}
                onClick={() => sendMessage(qa.query)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-primary-500/40 hover:bg-primary-500/5 text-dark-300 hover:text-primary-400 text-xs font-medium whitespace-nowrap transition-all disabled:opacity-50"
              >
                <QIcon size={13} />
                {qa.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          msg.role === 'user'
            ? <UserMessage key={i} text={msg.text} time={msg.timestamp} />
            : <AIMessage key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-primary-400" />
            </div>
            <div className="bg-dark-800/50 border border-dark-700/30 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-primary-400 animate-spin" />
                <span className="text-xs text-dark-400">Analiz edilir...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-dark-800/50 bg-dark-900/80 backdrop-blur-sm px-5 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Sualınızı yazın... (məs: bugünkü satışlar)"
            className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <p className="text-[10px] text-dark-600 mt-2 text-center">
          SmartQeyd AI · Offline · Yalnız lokal database məlumatları əsasında cavab verir
        </p>
      </div>
    </div>
  );
}
