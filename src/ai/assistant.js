/**
 * AI Assistant Orchestrator
 * 
 * Arxitektura:
 *   [İstifadəçi mesajı] → [Groq LLM (online)] → [Cavab]
 *                        → [Rule-based fallback (offline)] → [Cavab]
 * 
 * Primary: Groq API ilə LLM cavab (internet varsa)
 * Fallback: Rule-based intent parser + data access (offline)
 */

const { parseIntent, INTENTS } = require('./assistant-intent');
const dataAccess = require('./assistant-data');
const response = require('./assistant-response');
const { chatWithGroq } = require('./llm-provider');

/**
 * Database-dən kontekst məlumatı toplayıb LLM-ə göndərmək üçün
 */
function buildDbContext(userId) {
  try {
    const sales = dataAccess.getTodaySales(userId);
    const weekly = dataAccess.getWeeklySales(userId);
    const monthly = dataAccess.getMonthlySales(userId);
    const expenses = dataAccess.getTodayExpenses(userId);
    const monthlyExp = dataAccess.getMonthlyExpenses(userId);
    const cash = dataAccess.getCashBalance(userId);
    const debtors = dataAccess.getDebtors(userId);
    const lowStock = dataAccess.getLowStockProducts(userId);
    const topProducts = dataAccess.getTopSellingProducts(userId, 5);
    const tasks = dataAccess.getTodayTasks(userId);
    const overdue = dataAccess.getOverdueTasks(userId);
    const appointments = dataAccess.getTodayAppointments(userId);
    const newCustomers = dataAccess.getNewCustomersToday(userId);
    const customerStats = dataAccess.getCustomerStats(userId);
    const productStats = dataAccess.getProductStats(userId);
    const assets = dataAccess.getAssetSummary(userId);

    const today = new Date().toISOString().split('T')[0];
    const lines = [];
    lines.push(`Tarix: ${today}`);
    lines.push(`\n--- BUGÜNKÜ SATIŞLAR ---`);
    lines.push(`Satış sayı: ${sales.count}, Ümumi: ${sales.total} AZN, Orta çek: ${sales.avgCheck} AZN`);
    if (sales.topProduct) lines.push(`Ən çox satılan: ${sales.topProduct} (${sales.topProductQty} ədəd)`);

    lines.push(`\n--- HƏFTƏLİK SATIŞLAR (son 7 gün) ---`);
    lines.push(`Satış sayı: ${weekly.count}, Ümumi: ${weekly.total} AZN`);
    if (weekly.daily?.length) {
      weekly.daily.forEach(d => lines.push(`  ${d.date}: ${d.count} satış, ${d.total} AZN`));
    }

    lines.push(`\n--- AYLIK SATIŞLAR ---`);
    lines.push(`Satış sayı: ${monthly.count}, Ümumi: ${monthly.total} AZN`);

    lines.push(`\n--- BUGÜNKÜ XƏRCLƏR ---`);
    lines.push(`Xərc sayı: ${expenses.count}, Ümumi: ${expenses.total} AZN`);
    if (expenses.categories?.length) {
      expenses.categories.forEach(c => lines.push(`  ${c.category}: ${c.total} AZN`));
    }

    lines.push(`\n--- AYLIK XƏRCLƏR ---`);
    lines.push(`Xərc sayı: ${monthlyExp.count}, Ümumi: ${monthlyExp.total} AZN`);

    lines.push(`\n--- KASSA BALANSI ---`);
    lines.push(`Gəlir: ${cash.income} AZN, Xərc: ${cash.expense} AZN, Balans: ${cash.balance} AZN`);

    lines.push(`\n--- BORCLU MÜŞTƏRİLƏR ---`);
    lines.push(`Borclu sayı: ${debtors.count}, Ümumi borc: ${debtors.totalDebt} AZN`);
    if (debtors.customers?.length) {
      debtors.customers.slice(0, 10).forEach(c => lines.push(`  ${c.name}: ${c.amount} AZN`));
    }

    lines.push(`\n--- AZ QALAN STOK ---`);
    lines.push(`Az qalan məhsul sayı: ${lowStock.count}`);
    if (lowStock.products?.length) {
      lowStock.products.slice(0, 10).forEach(p => lines.push(`  ${p.name}: ${p.stock_qty}/${p.min_stock} ${p.unit || 'ədəd'}`));
    }

    lines.push(`\n--- ƏN ÇOX SATILAN MƏHSULLAR ---`);
    if (topProducts.products?.length) {
      topProducts.products.forEach((p, i) => lines.push(`  ${i + 1}. ${p.product_name}: ${p.total_qty} ədəd, ${p.total_revenue} AZN`));
    }

    lines.push(`\n--- TAPŞIRIQLAR ---`);
    lines.push(`Bu gün: ${tasks.total} (tamamlanıb: ${tasks.completed}, gözləmədə: ${tasks.pending})`);
    lines.push(`Gecikmiş: ${overdue.count}`);
    if (overdue.tasks?.length) {
      overdue.tasks.slice(0, 5).forEach(t => lines.push(`  ${t.title} (son tarix: ${t.due_date})`));
    }

    lines.push(`\n--- RANDEVULAR ---`);
    lines.push(`Bu gün: ${appointments.total} (tamamlanıb: ${appointments.completed}, gözləmədə: ${appointments.pending})`);

    lines.push(`\n--- MÜŞTƏRİLƏR ---`);
    lines.push(`Ümumi müştəri: ${customerStats.total}, Bu gün yeni: ${newCustomers.count}`);

    lines.push(`\n--- MƏHSULLAR ---`);
    lines.push(`Ümumi: ${productStats.total}, Stok dəyəri: ${productStats.stock_value} AZN`);

    lines.push(`\n--- AKTİVLƏR ---`);
    lines.push(`Aktiv sayı: ${assets.total}, Cari dəyər: ${assets.total_value} AZN`);

    return lines.join('\n');
  } catch (e) {
    return `Xəta: database məlumatı oxuna bilmədi: ${e.message}`;
  }
}

/**
 * Process user message and return formatted response
 * Primary: Groq LLM, Fallback: Rule-based
 * @param {string} message - İstifadəçi mesajı
 * @param {number|null} userId - Cari istifadəçi ID
 * @returns {Promise<{ success: boolean, data: object }>}
 */
async function processMessage(message, userId, history = []) {
  try {
    // Əvvəlcə rule-based intent yoxla
    const { intent, confidence, raw } = parseIntent(message);

    // Əgər "kömək" intent-idirsə, birbaşa rule-based cavab
    if (intent === INTENTS.HELP) {
      return {
        success: true,
        data: { intent, confidence, ...response.formatHelp(), timestamp: new Date().toISOString(), source: 'local' }
      };
    }

    // Groq LLM ilə cəhd et
    try {
      const dbContext = buildDbContext(userId);
      const llmHistory = history.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text || m.content || '',
      })).filter(m => m.content);
      const llmResult = await chatWithGroq(message, dbContext, llmHistory);
      if (llmResult.success && llmResult.text) {
        return {
          success: true,
          data: {
            intent: intent !== INTENTS.UNKNOWN ? intent : 'llm_response',
            confidence: 1.0,
            text: llmResult.text,
            type: 'info',
            icon: 'sparkles',
            timestamp: new Date().toISOString(),
            source: 'groq',
          }
        };
      }
    } catch (llmErr) {
      // LLM uğursuz — fallback-a keç
    }

    // Fallback: Rule-based cavab
    const result = executeIntent(intent, userId, raw);
    return {
      success: true,
      data: {
        intent,
        confidence,
        ...result,
        timestamp: new Date().toISOString(),
        source: 'local',
      }
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      data: {
        text: 'Sorğunu emal edərkən xəta baş verdi: ' + e.message,
        type: 'error',
        icon: 'alert-circle',
      }
    };
  }
}

/**
 * Execute intent and format response
 */
function executeIntent(intent, userId, raw) {
  switch (intent) {
    case INTENTS.TODAY_SALES:
      return response.formatTodaySales(dataAccess.getTodaySales(userId));

    case INTENTS.WEEKLY_SALES:
      return response.formatWeeklySales(dataAccess.getWeeklySales(userId));

    case INTENTS.MONTHLY_SALES:
      return response.formatMonthlySales(dataAccess.getMonthlySales(userId));

    case INTENTS.DEBTORS:
      return response.formatDebtors(dataAccess.getDebtors(userId));

    case INTENTS.LOW_STOCK:
      return response.formatLowStock(dataAccess.getLowStockProducts(userId));

    case INTENTS.TOP_PRODUCTS:
      return response.formatTopProducts(dataAccess.getTopSellingProducts(userId));

    case INTENTS.PRODUCT_STATS:
      return response.formatProductStats(dataAccess.getProductStats(userId));

    case INTENTS.NEW_CUSTOMERS:
      return response.formatNewCustomers(dataAccess.getNewCustomersToday(userId));

    case INTENTS.CUSTOMER_STATS:
      return response.formatCustomerStats(dataAccess.getCustomerStats(userId));

    case INTENTS.TODAY_TASKS:
      return response.formatTodayTasks(dataAccess.getTodayTasks(userId));

    case INTENTS.OVERDUE_TASKS:
      return response.formatOverdueTasks(dataAccess.getOverdueTasks(userId));

    case INTENTS.TODAY_EXPENSES:
      return response.formatTodayExpenses(dataAccess.getTodayExpenses(userId));

    case INTENTS.MONTHLY_EXPENSES:
      return response.formatMonthlyExpenses(dataAccess.getMonthlyExpenses(userId));

    case INTENTS.CASH_BALANCE:
      return response.formatCashBalance(dataAccess.getCashBalance(userId));

    case INTENTS.TODAY_APPOINTMENTS:
      return response.formatTodayAppointments(dataAccess.getTodayAppointments(userId));

    case INTENTS.ASSET_SUMMARY:
      return response.formatAssetSummary(dataAccess.getAssetSummary(userId));

    case INTENTS.SUPPLIER_STATS:
      return response.formatSupplierStats(dataAccess.getSupplierStats(userId));

    case INTENTS.DASHBOARD_SUMMARY:
      return response.formatDashboardSummary(dataAccess.getDashboardSummary(userId));

    case INTENTS.HELP:
      return response.formatHelp();

    default:
      return response.formatUnknown(raw);
  }
}

/**
 * Get quick action suggestions
 * @returns {Array} Quick action button list
 */
function getQuickActions() {
  return [
    { id: 'today_sales', label: 'Bugünkü satışlar', icon: 'shopping-cart', query: 'bugünkü satışlar' },
    { id: 'debtors', label: 'Borclu müştərilər', icon: 'credit-card', query: 'borclu müştərilər' },
    { id: 'low_stock', label: 'Az qalan stok', icon: 'package', query: 'stokda az qalan məhsullar' },
    { id: 'weekly', label: 'Həftəlik nəticə', icon: 'bar-chart', query: 'həftəlik satış nəticəsi' },
    { id: 'expenses', label: 'Bugünkü xərclər', icon: 'trending-down', query: 'bugünkü xərclər' },
    { id: 'tasks', label: 'Bugünkü işlər', icon: 'check-square', query: 'bugünkü tapşırıqlar' },
    { id: 'cash', label: 'Kassa balansı', icon: 'dollar-sign', query: 'kassada nə qədər pul var' },
    { id: 'summary', label: 'Ümumi xülasə', icon: 'layout-dashboard', query: 'ümumi vəziyyət' },
  ];
}

module.exports = { processMessage, getQuickActions, INTENTS };
