import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle, Zap, Bot, Shield, Package, Rocket } from 'lucide-react';

const CURRENT_VERSION = '1.6.4';

// Versiyalar sıra ilə (ən yenidən köhnəyə)
const CHANGELOGS = [
  {
    version: '1.6.4',
    title: 'SmartQeyd v1.6.4 — Dashboard Data İzolasiyası & SmartQeyd Branding! 🛡️',
    date: '2026-03-22',
    highlights: [
      { icon: Shield, text: 'Dashboard: Başqa istifadəçinin məlumatları artıq görünmür' },
      { icon: Sparkles, text: 'Güncəlləmə ekranı: SmartQeyd brendingi əlavə edildi' },
      { icon: Package, text: 'DashboardService: Bütün sorğular userId ilə filtr olunur' },
      { icon: Rocket, text: 'Müştəri, randevu, tapşırıq, maliyyə — tam istifadəçi izolasiyası' },
    ],
    changes: [
      'DashboardService: customerCount, appointments, tasks, recentTransactions userId filtrə əlavə edildi',
      'DashboardService: topProducts, monthlyChart sorğuları da userId ilə filtr olunur',
      'Güncəlləmə ekranında GitHub əvəzinə SmartQeyd brendingi',
      'Güncəlləmə footer: SmartQeyd güncəllənir / yenidən başladılacaq',
      'Versiya v1.6.4 bütün ekranlarda göstərilir',
    ],
  },
  {
    version: '1.6.3',
    title: 'SmartQeyd v1.6.3 — Lisenziya & Güncəlləmə Düzəlişi! 🔑',
    date: '2026-03-22',
    highlights: [
      { icon: Shield, text: 'Lisenziya aktivasiyası düzəldildi: Artıq daxil olduqda yenidən istəmir' },
      { icon: Sparkles, text: 'Güncəlləmə ekranı tamamilə yenidən dizayn edildi' },
      { icon: Package, text: 'Versiya nömrəsi bütün ekranlarda düzgün göstərilir' },
      { icon: Rocket, text: 'apiBridge: İstifadəçi lisenziya metodları əlavə edildi' },
    ],
    changes: [
      'apiBridge-ə checkUserLicense, activateUserLicense, generateUserLicense əlavə edildi',
      'Lisenziya aktivasiyadan sonra düzgün saxlanılır (bridge bug fix)',
      'Güncəlləmə ekranı: Yeni gradient dizayn, animasiyalar, gözəl UI',
      'Versiya v1.6.3 bütün ekranlarda (Login, Sidebar, Lisenziya) göstərilir',
      'WhatsNew changelog v1.6.3 əlavə edildi',
    ],
  },
  {
    version: '1.6.2',
    title: 'SmartQeyd v1.6.2 — Gözəl Güncəlləmə & AI Təkmilləşdirmə! 🎉',
    date: '2026-03-22',
    highlights: [
      { icon: Sparkles, text: 'Güncəlləmə ekranı: GitHub tematik gözəl dizayn, mərkəzdə modal' },
      { icon: Shield, text: 'AI rate limit düzəldildi: Avtomatik retry mexanizmi (3 cəhd)' },
      { icon: Package, text: 'Lisenziya UNIQUE xətası həll edildi' },
      { icon: Rocket, text: 'Token istifadəsi optimallasdırıldı: daha az TPM' },
    ],
    changes: [
      'Güncəlləmə ekranı: GitHub logo, progress bar, addımlar (Yüklənir, Aktarılır, Yoxlanır)',
      'Şəhər silueti illustrasiya, kağız təyyarələri, gradient arxa plan',
      'AI: Groq rate limit (429) avtomatik retry — gözləmə vaxtı parse edilir',
      'AI: Söhbət tarixçəsi 6 mesaja, max_tokens 1500-ə azaldıldı (TPM optimallasdırma)',
      'Lisenziya: Pending açar INSERT əvəzinə UPDATE (UNIQUE fix)',
      'Güncəlləmə tamamlandıqda Quraşdır düyməsi görünür',
    ],
  },
  {
    version: '1.5.7',
    title: 'SmartQeyd v1.5.7 — Gözəl Güncəlləmə Ekranı! 🎉',
    date: '2026-03-22',
    highlights: [
      { icon: Sparkles, text: 'UpdateNotification: GitHub məlumatları və gözəl dizayn' },
      { icon: Shield, text: 'Bildiriş sistemi düzəldildi: Dashboard notifCheckRes işlənir' },
      { icon: Package, text: 'Emoji və modern UI: Progress bar, detallar, GitHub commit info' },
      { icon: Rocket, text: 'Avtomatik güncəlləmə: GitHub push sonrası səliqəli məlumatlar' },
    ],
    changes: [
      'UpdateNotification: Tam yeniləndi - 420px genişlik, gradient dizayn',
      'GitHub məlumatları: Commit hash, müəllif, tarix, fayl ölçüsü göstərilir',
      'Changelog: Emoji ilə kateqoriyalar (🆕 yeni, 🐛 düzəliş, ⚡ təkmilləşdirmə)',
      'Progress bar: Gradient animasiya, shadow effektləri',
      'Dashboard: notifCheckRes nəticəsi düzgün işlənir, sistem bildirişləri göstərilir',
      'Button dizaynı: Hover effektləri, scale animasiyaları, emoji',
      'Detallar bölməsi: GitHub commit, müəllif, tarix məlumatları',
      'Footer: Avtomatik güncəlləmə və GitHub sinxronizasiya məlumatı',
    ],
  },
  {
    version: '1.5.6',
    title: 'SmartQeyd v1.5.6 — Tam apiBridge Migration!',
    date: '2026-03-22',
    highlights: [
      { icon: Zap, text: 'apiBridge: Bütün 17 səhifə unified API ilə işləyir' },
      { icon: Shield, text: 'Kod təmizliyi: 300+ sətir köhnə window.api/apiRequest silindi' },
      { icon: Package, text: 'Records, Suppliers, Vehicles, Notifications tam keçid' },
      { icon: Rocket, text: 'StockMovements, Assets, Analytics, CustomerHistory, PriceBase keçid' },
    ],
    changes: [
      'Records.jsx: CRUD + customer detail + bulk delete → apiBridge',
      'Suppliers.jsx: CRUD + supplier products → apiBridge',
      'Vehicles.jsx: CRUD + customer list → apiBridge (parallel Promise.all)',
      'Notifications.jsx: load + markRead + markAllRead + delete → apiBridge',
      'StockMovements.jsx: getStockMovements → apiBridge',
      'Assets.jsx: CRUD (getAssets, createAsset, updateAsset, deleteAsset) → apiBridge',
      'Analytics.jsx: getSales + getExpenses + getProducts → apiBridge',
      'CustomerHistory.jsx: getCustomers + getRecords + getSales → apiBridge',
      'PriceBase.jsx: getPrices + createPrice + updatePrice + deletePrice → apiBridge',
      'Electron-only funksiyalar (Export, Settings, License, Reports) saxlanıb',
    ],
  },
  {
    version: '1.5.5',
    title: 'SmartQeyd v1.5.5 — Unified API & Detail Pages!',
    date: '2026-03-20',
    highlights: [
      { icon: Package, text: 'Detail səhifələr: Müştəri, Məhsul, Satış — tam detallı görünüş' },
      { icon: Zap, text: 'apiBridge: Bütün əsas səhifələr unified API ilə işləyir' },
      { icon: Shield, text: 'Finance gücləndirildi: Trend chart, kateqoriya analizi, ödəniş statistikası' },
      { icon: Rocket, text: 'Dashboard optimallaşdırıldı: DashboardService single-call' },
    ],
    changes: [
      'CustomerDetail: Müştəri icmalı, satışlar, borclar, nəqliyyat, timeline, qeydlər',
      'ProductDetail: Stok, qiymət tarixçəsi, stok hərəkətləri, son satışlar',
      'SaleDetail: Məhsullar, borc, maliyyə əməliyyatları, stok hərəkətləri',
      'Siyahılardan detail səhifələrə klik ilə keçid (müştəri adı, məhsul adı, satış №)',
      'POS/NewSale/Expenses/Debts/Products/Customers/Sales → apiBridge migration',
      'Finance: FinanceService trend chart (gəlir vs xərc), kateqoriya pie chart',
      'Dashboard: 21 paralel call → DashboardService single-call + əlavə data',
      'Route sırası düzəldildi: /sales/new → /sales/:id ardıcıllığı',
    ],
  },
  {
    version: '1.5.4',
    title: 'SmartQeyd v1.5.4 — Tam Biznes İnteqrasiya!',
    date: '2026-03-20',
    highlights: [
      { icon: Zap, text: 'Service Layer: Satış, borc, xərc, stok — tam transaction əsaslı' },
      { icon: Shield, text: 'Audit Log: Bütün əməliyyatlar avtomatik qeydə alınır' },
      { icon: Package, text: 'Detail səhifələr: Müştəri, məhsul, satış, borc detallı görünüş' },
      { icon: Rocket, text: 'Real Dashboard: Bütün data real vaxtda hesablanır' },
    ],
    changes: [
      'SalesService: Satış → stok azalma → maliyyə → borc — bir transaction-da',
      'DebtService: Borc ödənişi → satış yenilənmə → maliyyə qeydi avtomatik',
      'StockService: Stok giriş/çıxış/düzəliş + qiymət tarixçəsi',
      'CustomerService: Müştəri detail + timeline (satış, borc, ödəniş, randevu)',
      'DashboardService: Real-time gəlir, xərc, borc, stok, chart data',
      'NotificationService: Aşağı stok, gecikmiş borc, yaxın randevu xəbərdarlıqları',
      'AuditService: Yaratma, silmə, yeniləmə, ödəniş — tam iz qeydi',
      'Qeyd sistemi (Notes): Müştəri/satış/vasitə üçün qeydlər',
      'Qiymət tarixçəsi (Price History): Hər dəyişiklik qeydə alınır',
      'Migration v16: debts, notes, price_history cədvəlləri + index-lər',
      'Dashboard-da randevular, tapşırıqlar, müştəri sayı düzəldildi',
    ],
  },
  {
    version: '1.5.2',
    title: 'SmartQeyd v1.5.2 — AI Tam Gücləndirildi!',
    date: '2026-03-20',
    highlights: [
      { icon: Bot, text: 'AI ilə əlavə et, sil, axtar, siyahı göstər — tam idarəetmə' },
      { icon: Zap, text: 'Söhbət tarixçəsi yadda qalır — proqramı bağlayıb açsanız da' },
      { icon: Shield, text: 'AI bağlantı problemi həll edildi — AI tam işləyir' },
      { icon: Rocket, text: 'Müştəri, məhsul, xərc, tapşırıq, randevu silmə dəstəyi' },
    ],
    changes: [
      'AI ilə müştəri, məhsul, xərc, tapşırıq, randevu SİLMƏK mümkündür',
      'AI ilə siyahı göstərmək: müştərilər, məhsullar, xərclər, tapşırıqlar, randevular',
      'Söhbət tarixçəsi localStorage-da saxlanılır (100 mesaja qədər)',
      'AI köməkçi Groq LLM ilə tam funksional — limitsiz söhbət',
      'AI bağlantı və API key problemi tamamilə həll edildi',
      'Güncəlləmə sonrası yeniliklər pəncərəsi düzəldildi',
      'Performans və sabitlik təkmilləşdirmələri',
    ],
  },
];

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export default function WhatsNew() {
  const [visible, setVisible] = useState(false);
  const [changelog, setChangelog] = useState(null);

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem('smartqeyd_last_seen_version') || '0.0.0';
      if (compareVersions(CURRENT_VERSION, lastSeen) > 0) {
        // Ən son changelog-u göstər
        const latest = CHANGELOGS[0];
        if (latest) {
          setChangelog(latest);
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
