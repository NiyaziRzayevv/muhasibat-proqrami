/**
 * AI Assistant Intent Parser
 * İstifadəçinin mesajını analiz edib niyyətini (intent) təyin edir.
 * Rule-based sistem — offline işləyir.
 * Gələcəkdə lokal LLM (Ollama) ilə əvəz edilə bilər.
 */

const INTENTS = {
  TODAY_SALES:        'today_sales',
  WEEKLY_SALES:       'weekly_sales',
  MONTHLY_SALES:      'monthly_sales',
  DEBTORS:            'debtors',
  LOW_STOCK:          'low_stock',
  TOP_PRODUCTS:       'top_products',
  PRODUCT_STATS:      'product_stats',
  NEW_CUSTOMERS:      'new_customers',
  CUSTOMER_STATS:     'customer_stats',
  TODAY_TASKS:        'today_tasks',
  OVERDUE_TASKS:      'overdue_tasks',
  TODAY_EXPENSES:     'today_expenses',
  MONTHLY_EXPENSES:   'monthly_expenses',
  CASH_BALANCE:       'cash_balance',
  TODAY_APPOINTMENTS: 'today_appointments',
  ASSET_SUMMARY:      'asset_summary',
  SUPPLIER_STATS:     'supplier_stats',
  DASHBOARD_SUMMARY:  'dashboard_summary',
  HELP:               'help',
  UNKNOWN:            'unknown',
};

// Hər intent üçün açar sözlər və pattern-lər
const INTENT_RULES = [
  {
    intent: INTENTS.TODAY_SALES,
    patterns: [
      /bug[uü]n[kü]?\s*(sat[ıi][sş]|sat[ıi]lan)/i,
      /bu\s*g[uü]n\s*(ne[cç][eə])?\s*sat[ıi][sş]/i,
      /g[uü]nl[uü]k\s*sat[ıi][sş]/i,
      /bug[uü]n\s*ne\s*q[eə]d[eə]r\s*sat/i,
      /sat[ıi][sş]\s*n[eə]\s*q[eə]d[eə]r/i,
      /bug[uü]nk[uü]\s*g[eə]lir/i,
      /ne[cç][eə]\s*sat[ıi][sş]\s*ol/i,
      /sat[ıi][sş]lar$/i,
      /bug[uü]n\s*sat[ıi][sş]/i,
    ],
    keywords: ['bugünkü satış', 'satışlar', 'satış nəticəsi', 'neçə satış', 'günlük satış'],
  },
  {
    intent: INTENTS.WEEKLY_SALES,
    patterns: [
      /h[eə]ft[eə]lik\s*(sat[ıi][sş]|n[eə]tic[eə])/i,
      /son\s*7\s*g[uü]n/i,
      /son\s*bir\s*h[eə]ft[eə]/i,
      /bu\s*h[eə]ft[eə]/i,
      /7\s*g[uü]nl[uü]k/i,
      /h[eə]ft[eə]nin\s*n[eə]tic[eə]si/i,
    ],
    keywords: ['həftəlik', 'son 7 gün', 'bu həftə', 'həftəlik nəticə'],
  },
  {
    intent: INTENTS.MONTHLY_SALES,
    patterns: [
      /ayl[ıi]q\s*sat[ıi][sş]/i,
      /bu\s*ay/i,
      /ayl[ıi]q\s*n[eə]tic[eə]/i,
      /bu\s*ay[ıi]n\s*sat[ıi][sş]/i,
    ],
    keywords: ['aylıq satış', 'bu ay', 'aylıq nəticə'],
  },
  {
    intent: INTENTS.DEBTORS,
    patterns: [
      /borc(lu|lar)?/i,
      /borclu\s*m[uü][sş]t[eə]ri/i,
      /kim\s*borc/i,
      /borc\s*n[eə]\s*q[eə]d[eə]r/i,
      /[oö]d[eə]nilm[eə]mi[sş]/i,
      /borclar$/i,
    ],
    keywords: ['borclu', 'borclar', 'borc', 'ödənilməmiş'],
  },
  {
    intent: INTENTS.LOW_STOCK,
    patterns: [
      /stok(da)?\s*(az|bit|t[uü]k[eə]n)/i,
      /az\s*(qalan|olan)\s*(stok|m[eə]hsul)/i,
      /m[eə]hsul(lar)?\s*bit/i,
      /stok\s*x[eə]b[eə]rdarl[ıi][gğ]/i,
      /bitm[eə]k\s*[uü]zr[eə]/i,
      /stok\s*azal/i,
      /t[uü]k[eə]nm[eə]k/i,
    ],
    keywords: ['az stok', 'stok azalıb', 'bitmək üzrə', 'stok xəbərdarlıq'],
  },
  {
    intent: INTENTS.TOP_PRODUCTS,
    patterns: [
      /[eə]n\s*[cç]ox\s*sat[ıi]lan/i,
      /populyar\s*m[eə]hsul/i,
      /top\s*m[eə]hsul/i,
      /[eə]n\s*yax[sş][ıi]\s*sat[ıi]lan/i,
      /hans[ıi]\s*m[eə]hsul\s*[cç]ox\s*sat[ıi]l/i,
    ],
    keywords: ['ən çox satılan', 'top məhsul', 'populyar'],
  },
  {
    intent: INTENTS.PRODUCT_STATS,
    patterns: [
      /m[eə]hsul\s*statistika/i,
      /stok\s*d[eə]y[eə]ri/i,
      /ne[cç][eə]\s*m[eə]hsul\s*var/i,
      /m[eə]hsul\s*say[ıi]/i,
    ],
    keywords: ['məhsul statistika', 'stok dəyəri', 'neçə məhsul'],
  },
  {
    intent: INTENTS.NEW_CUSTOMERS,
    patterns: [
      /yeni\s*m[uü][sş]t[eə]ri/i,
      /bug[uü]n\s*ne[cç][eə]\s*(yeni\s*)?m[uü][sş]t[eə]ri/i,
      /m[uü][sş]t[eə]ri\s*[eə]lav[eə]/i,
      /yeni\s*qeydiyyat/i,
    ],
    keywords: ['yeni müştəri', 'müştəri əlavə', 'neçə müştəri'],
  },
  {
    intent: INTENTS.CUSTOMER_STATS,
    patterns: [
      /m[uü][sş]t[eə]ri\s*statistika/i,
      /[uü]mumi\s*m[uü][sş]t[eə]ri/i,
      /ne[cç][eə]\s*m[uü][sş]t[eə]ri/i,
      /m[uü][sş]t[eə]ri\s*say/i,
    ],
    keywords: ['müştəri statistika', 'ümumi müştəri', 'müştəri sayı'],
  },
  {
    intent: INTENTS.TODAY_TASKS,
    patterns: [
      /bug[uü]n[kü]?\s*(tap[sş][ıi]r[ıi]q|i[sş])/i,
      /bu\s*g[uü]n\s*hans[ıi]\s*i[sş]/i,
      /g[oö]r[uü]l[eə]n\s*i[sş]/i,
      /bu\s*g[uü]n\s*ne\s*(ed|g[oö]r)/i,
      /tap[sş][ıi]r[ıi]q(lar)?$/i,
      /i[sş]l[eə]r$/i,
      /bug[uü]n\s*hans[ıi]\s*i[sş]l[eə]r/i,
    ],
    keywords: ['bugünkü tapşırıq', 'bugünkü işlər', 'görülən iş'],
  },
  {
    intent: INTENTS.OVERDUE_TASKS,
    patterns: [
      /gecikmi[sş]\s*tap[sş][ıi]r[ıi]q/i,
      /vaxt[ıi]\s*ke[cç]mi[sş]/i,
      /tamamlanmam[ıi][sş]/i,
      /ge[cç]\s*qalm[ıi][sş]/i,
      /overdue/i,
    ],
    keywords: ['gecikmiş tapşırıq', 'vaxtı keçmiş', 'geç qalmış'],
  },
  {
    intent: INTENTS.TODAY_EXPENSES,
    patterns: [
      /bug[uü]n[kü]?\s*x[eə]rc/i,
      /bu\s*g[uü]n\s*ne\s*q[eə]d[eə]r\s*x[eə]rc/i,
      /g[uü]nl[uü]k\s*x[eə]rc/i,
      /x[eə]rc(l[eə]r)?\s*n[eə]\s*q[eə]d[eə]r/i,
    ],
    keywords: ['bugünkü xərc', 'xərclər', 'günlük xərc'],
  },
  {
    intent: INTENTS.MONTHLY_EXPENSES,
    patterns: [
      /ayl[ıi]q\s*x[eə]rc/i,
      /bu\s*ay[ıi]n\s*x[eə]rc/i,
    ],
    keywords: ['aylıq xərc', 'bu ayın xərci'],
  },
  {
    intent: INTENTS.CASH_BALANCE,
    patterns: [
      /kassa(da)?\s*(ne\s*q[eə]d[eə]r|balans|pul)/i,
      /pul\s*n[eə]\s*q[eə]d[eə]r/i,
      /balans/i,
      /kassa\s*durumu/i,
      /maliyy[eə]\s*balans/i,
      /n[eə]\s*q[eə]d[eə]r\s*pul/i,
    ],
    keywords: ['kassa', 'balans', 'nə qədər pul', 'kassa durumu'],
  },
  {
    intent: INTENTS.TODAY_APPOINTMENTS,
    patterns: [
      /bug[uü]n[kü]?\s*(randevu|g[oö]r[uü][sş])/i,
      /randevu(lar)?$/i,
      /g[oö]r[uü][sş](l[eə]r)?$/i,
    ],
    keywords: ['randevu', 'görüş', 'bugünkü randevu'],
  },
  {
    intent: INTENTS.ASSET_SUMMARY,
    patterns: [
      /aktiv(l[eə]r)?/i,
      /avadanl[ıi]q/i,
      /[eə]mlak/i,
    ],
    keywords: ['aktivlər', 'avadanlıq', 'əmlak'],
  },
  {
    intent: INTENTS.SUPPLIER_STATS,
    patterns: [
      /t[eə][cç]hizat[cç][ıi]/i,
      /supplier/i,
    ],
    keywords: ['təchizatçı', 'supplier'],
  },
  {
    intent: INTENTS.DASHBOARD_SUMMARY,
    patterns: [
      /[uü]mumi\s*(v[eə]ziyy[eə]t|durum|x[uü]las[eə])/i,
      /dashboard/i,
      /[uü]mumi\s*hesabat/i,
      /g[uü]nl[uü]k\s*hesabat/i,
      /bug[uü]n[uü]n\s*x[uü]las[eə]si/i,
      /n[eə]\s*v[eə]ziyy[eə]t/i,
      /necedir\s*v[eə]ziyy[eə]t/i,
    ],
    keywords: ['ümumi vəziyyət', 'dashboard', 'xülasə', 'günlük hesabat'],
  },
  {
    intent: INTENTS.HELP,
    patterns: [
      /k[oö]m[eə]k/i,
      /ne\s*ed[eə]\s*bil[eə]rs[eə]n/i,
      /nec[eə]\s*istifad[eə]/i,
      /help/i,
      /sual(lar)?/i,
      /n[eə]\s*sor(u[sş]a)?/i,
    ],
    keywords: ['kömək', 'help', 'nə edə bilərsən'],
  },
];

/**
 * Normalize text: lowercase, trim, simplify Azerbaijani chars
 */
function normalize(text) {
  return (text || '').trim().toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
    .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c')
    .replace(/ğ/g, 'g');
}

/**
 * Parse intent from user message
 * @param {string} message - İstifadəçi mesajı
 * @returns {{ intent: string, confidence: number, raw: string }}
 */
function parseIntent(message) {
  if (!message || !message.trim()) {
    return { intent: INTENTS.UNKNOWN, confidence: 0, raw: message };
  }

  const raw = message.trim();
  let bestIntent = INTENTS.UNKNOWN;
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;

    // Pattern match (ən güclü siqnal)
    for (const pattern of rule.patterns) {
      if (pattern.test(raw)) {
        score = Math.max(score, 0.9);
        break;
      }
    }

    // Keyword match (əlavə siqnal)
    const norm = normalize(raw);
    for (const kw of rule.keywords) {
      const normKw = normalize(kw);
      if (norm.includes(normKw)) {
        score = Math.max(score, 0.7);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.intent;
    }
  }

  return { intent: bestIntent, confidence: bestScore, raw };
}

module.exports = { parseIntent, INTENTS };
