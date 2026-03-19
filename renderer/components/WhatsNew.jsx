import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle, Zap, Bot, Shield, Package } from 'lucide-react';

const CURRENT_VERSION = '1.4.9';

const CHANGELOGS = {
  '1.4.8': {
    title: 'SmartQeyd v1.4.8 — AI Tam İşlək + Düzəlişlər',
    date: '2026-03-19',
    highlights: [
      { icon: Bot, text: 'AI Köməkçi tam söhbət rejimində — Groq LLM ilə limitsiz söhbət' },
      { icon: Zap, text: 'AI vasitəsilə müştəri, məhsul, xərc, tapşırıq əlavə etmək mümkündür' },
      { icon: Shield, text: 'API key və model düzəldildi — AI artıq tam işləyir' },
      { icon: Package, text: 'Masaüstü ikon düzəldildi' },
    ],
    changes: [
      'AI köməkçi Groq LLM ilə tam funksional — limitsiz söhbət',
      'AI vasitəsilə müştəri, məhsul, xərc, tapşırıq, randevu əlavə etmək',
      'AI proqramın database-ini tam oxuyur və dəqiq cavab verir',
      'Güncəlləmə sonrası yeniliklər pəncərəsi',
      'Masaüstü ikon düzəldildi',
      'Performans və sabitlik təkmilləşdirmələri',
    ],
  },
  '1.4.7': {
    title: 'SmartQeyd v1.4.7 — AI Köməkçi + Yeniliklər',
    date: '2026-03-19',
    highlights: [
      { icon: Bot, text: 'AI Köməkçi tam söhbət rejimində — istənilən sualınızı cavablandırır' },
      { icon: Zap, text: 'AI ilə müştəri əlavə etmə, məhsul axtarışı, xərc yaratma və digər əməliyyatlar' },
      { icon: Shield, text: 'Güncəlləmə prosesi təkmilləşdirildi — avtomatik bağlanma və yenidən başlama' },
      { icon: Package, text: 'Proqram ikonu və masaüstü qısayolu düzəldildi' },
    ],
    changes: [
      'AI köməkçi tam funksional — limitsiz söhbət, hər mövzuda cavab',
      'AI vasitəsilə müştəri, məhsul, xərc, tapşırıq əlavə etmək mümkündür',
      'AI proqramın database-ini tam oxuyur və dəqiq cavab verir',
      'Masaüstü ikon düzəldildi — SmartQeyd logosu görünür',
      'Güncəlləmə sonrası yeniliklər pəncərəsi əlavə edildi',
      'Performans və sabitlik təkmilləşdirmələri',
    ],
  },
  '1.4.6': {
    title: 'SmartQeyd v1.4.6',
    date: '2026-03-19',
    highlights: [],
    changes: [
      'AI action sistemi əlavə edildi',
      'Söhbət tarixçəsi dəstəyi',
      'İkon düzəlişləri',
    ],
  },
};

export default function WhatsNew() {
  const [visible, setVisible] = useState(false);
  const [changelog, setChangelog] = useState(null);

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem('smartqeyd_last_seen_version');
      if (lastSeen !== CURRENT_VERSION) {
        const log = CHANGELOGS[CURRENT_VERSION];
        if (log) {
          setChangelog(log);
          setVisible(true);
        }
      }
    } catch {}
  }, []);

  function handleClose() {
    setVisible(false);
    try {
      localStorage.setItem('smartqeyd_last_seen_version', CURRENT_VERSION);
    } catch {}
  }

  if (!visible || !changelog) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-900 border border-dark-700/60 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600/30 via-blue-500/20 to-emerald-500/20 px-6 py-5 border-b border-dark-800/50">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-dark-800/60 hover:bg-dark-700 text-dark-400 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Sparkles size={20} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{changelog.title}</h2>
              <p className="text-xs text-dark-400 mt-0.5">{changelog.date}</p>
            </div>
          </div>
        </div>

        {/* Highlights */}
        {changelog.highlights?.length > 0 && (
          <div className="px-6 py-4 border-b border-dark-800/30">
            <div className="grid grid-cols-2 gap-3">
              {changelog.highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-dark-800/40 border border-dark-700/30">
                    <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-primary-400" />
                    </div>
                    <p className="text-xs text-dark-200 leading-relaxed">{h.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Changes list */}
        <div className="px-6 py-4 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Bütün dəyişikliklər</p>
          <ul className="space-y-2">
            {changelog.changes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800/30">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors"
          >
            Anladım, davam et
          </button>
        </div>
      </div>
    </div>
  );
}
