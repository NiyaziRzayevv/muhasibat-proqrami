/**
 * AI Assistant Data Access Layer
 * Yalnız SELECT sorğuları — təhlükəsiz, read-only.
 * Bütün funksiyalar lokal SQLite database-dən oxuyur.
 */

const { getDb } = require('../database/index');

function today() {
  return new Date().toISOString().split('T')[0];
}

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── SATIŞLAR ────────────────────────────────────────────

function getTodaySales(userId) {
  const db = getDb();
  const dateStr = today();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';
  const row = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total, COALESCE(AVG(total), 0) as avg_check
    FROM sales WHERE date = ? ${userFilter}
  `).get(dateStr);

  const topProduct = db.prepare(`
    SELECT si.product_name, SUM(si.qty) as total_qty
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.date = ? ${userFilter}
    GROUP BY si.product_name
    ORDER BY total_qty DESC LIMIT 1
  `).get(dateStr);

  return {
    count: row?.count || 0,
    total: row?.total || 0,
    avgCheck: Math.round(row?.avg_check || 0),
    topProduct: topProduct?.product_name || null,
    topProductQty: topProduct?.total_qty || 0,
  };
}

function getWeeklySales(userId) {
  const db = getDb();
  const start = weekAgo();
  const end = today();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';

  const row = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total, COALESCE(AVG(total), 0) as avg_check
    FROM sales WHERE date >= ? AND date <= ? ${userFilter}
  `).get(start, end);

  const daily = db.prepare(`
    SELECT date, COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM sales WHERE date >= ? AND date <= ? ${userFilter}
    GROUP BY date ORDER BY date
  `).all(start, end);

  return {
    count: row?.count || 0,
    total: row?.total || 0,
    avgCheck: Math.round(row?.avg_check || 0),
    daily,
    startDate: start,
    endDate: end,
  };
}

function getMonthlySales(userId) {
  const db = getDb();
  const start = monthStart();
  const end = today();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';

  const row = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM sales WHERE date >= ? AND date <= ? ${userFilter}
  `).get(start, end);

  return { count: row?.count || 0, total: row?.total || 0, startDate: start, endDate: end };
}

// ─── BORCLAR ─────────────────────────────────────────────

function getDebtors(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (s.created_by = ${Number(userId)} OR s.created_by IS NULL)` : '';

  const rows = db.prepare(`
    SELECT s.customer_name, s.total, s.paid_amount, (s.total - s.paid_amount) as remaining
    FROM sales s
    WHERE s.payment_status != 'odenilib' AND (s.total - s.paid_amount) > 0 ${userFilter}
    ORDER BY remaining DESC
  `).all();

  const recordDebts = db.prepare(`
    SELECT r.customer_name, r.total_price as total, r.paid_amount, r.remaining_amount as remaining
    FROM records r
    WHERE r.payment_status != 'odenilib' AND r.remaining_amount > 0 ${userId ? `AND (r.created_by = ${Number(userId)} OR r.created_by IS NULL)` : ''}
    ORDER BY remaining DESC
  `).all();

  const all = [...rows, ...recordDebts];
  const totalDebt = all.reduce((s, r) => s + (r.remaining || 0), 0);

  // Group by customer
  const byCustomer = {};
  for (const r of all) {
    const name = r.customer_name || 'Naməlum';
    if (!byCustomer[name]) byCustomer[name] = 0;
    byCustomer[name] += r.remaining || 0;
  }
  const customers = Object.entries(byCustomer)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { count: customers.length, totalDebt, customers };
}

// ─── STOK ────────────────────────────────────────────────

function getLowStockProducts(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';
  const rows = db.prepare(`
    SELECT name, stock_qty, min_stock, unit, sell_price
    FROM products
    WHERE stock_qty <= min_stock ${userFilter}
    ORDER BY (stock_qty - min_stock) ASC
    LIMIT 20
  `).all();

  return { count: rows.length, products: rows };
}

function getTopSellingProducts(userId, limit = 10) {
  const db = getDb();
  const userFilter = userId ? `AND (s.created_by = ${Number(userId)} OR s.created_by IS NULL)` : '';
  const rows = db.prepare(`
    SELECT si.product_name, SUM(si.qty) as total_qty, SUM(si.total) as total_revenue
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE 1=1 ${userFilter}
    GROUP BY si.product_name
    ORDER BY total_qty DESC
    LIMIT ?
  `).all(limit);

  return { products: rows };
}

function getProductStats(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';
  const row = db.prepare(`
    SELECT COUNT(*) as total, 
           COALESCE(SUM(stock_qty), 0) as total_stock,
           COALESCE(SUM(stock_qty * sell_price), 0) as stock_value,
           COALESCE(SUM(stock_qty * buy_price), 0) as stock_cost
    FROM products WHERE 1=1 ${userFilter}
  `).get();

  return row || { total: 0, total_stock: 0, stock_value: 0, stock_cost: 0 };
}

// ─── MÜŞTƏRİLƏR ─────────────────────────────────────────

function getNewCustomersToday(userId) {
  const db = getDb();
  const dateStr = today();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM customers
    WHERE date(created_at) = ? ${userFilter}
  `).get(dateStr);

  const customers = db.prepare(`
    SELECT name, phone FROM customers
    WHERE date(created_at) = ? ${userFilter}
    ORDER BY created_at DESC LIMIT 10
  `).all(dateStr);

  return { count: row?.count || 0, customers };
}

function getCustomerStats(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';
  const row = db.prepare(`
    SELECT COUNT(*) as total FROM customers WHERE 1=1 ${userFilter}
  `).get();

  return { total: row?.total || 0 };
}

// ─── TAPŞIRIQLAR ─────────────────────────────────────────

function getTodayTasks(userId) {
  const db = getDb();
  const dateStr = today();

  const all = db.prepare(`
    SELECT title, status, priority, due_date FROM tasks
    WHERE due_date = ? ${userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : ''}
    ORDER BY priority DESC
  `).all(dateStr);

  const completed = all.filter(t => t.status === 'done').length;
  const pending = all.filter(t => t.status !== 'done').length;

  return { total: all.length, completed, pending, tasks: all };
}

function getOverdueTasks(userId) {
  const db = getDb();
  const dateStr = today();

  const rows = db.prepare(`
    SELECT title, status, priority, due_date FROM tasks
    WHERE due_date < ? AND status != 'done'
    ${userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : ''}
    ORDER BY due_date ASC
    LIMIT 20
  `).all(dateStr);

  return { count: rows.length, tasks: rows };
}

// ─── XƏRCLƏR ─────────────────────────────────────────────

function getTodayExpenses(userId) {
  const db = getDb();
  const dateStr = today();
  const userFilter = userId ? `AND (user_id = ${Number(userId)} OR user_id IS NULL)` : '';

  const row = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE date = ? AND deleted_at IS NULL ${userFilter}
  `).get(dateStr);

  const categories = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE date = ? AND deleted_at IS NULL ${userFilter}
    GROUP BY category ORDER BY total DESC
  `).all(dateStr);

  return { count: row?.count || 0, total: row?.total || 0, categories };
}

function getMonthlyExpenses(userId) {
  const db = getDb();
  const start = monthStart();
  const end = today();
  const userFilter = userId ? `AND (user_id = ${Number(userId)} OR user_id IS NULL)` : '';

  const row = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM expenses WHERE date >= ? AND date <= ? AND deleted_at IS NULL ${userFilter}
  `).get(start, end);

  return { count: row?.count || 0, total: row?.total || 0 };
}

// ─── MALİYYƏ / KASSA ────────────────────────────────────

function getCashBalance(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';

  const income = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions
    WHERE type = 'income' ${userFilter}
  `).get();

  const expense = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions
    WHERE type = 'expense' ${userFilter}
  `).get();

  return {
    income: income?.total || 0,
    expense: expense?.total || 0,
    balance: (income?.total || 0) - (expense?.total || 0),
  };
}

// ─── RANDEVULAR ──────────────────────────────────────────

function getTodayAppointments(userId) {
  const db = getDb();
  const dateStr = today();

  const rows = db.prepare(`
    SELECT title, customer_name, time, status FROM appointments
    WHERE date = ?
    ${userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : ''}
    ORDER BY time ASC
  `).all(dateStr);

  const completed = rows.filter(r => r.status === 'completed').length;
  const pending = rows.filter(r => r.status === 'pending').length;

  return { total: rows.length, completed, pending, appointments: rows };
}

// ─── AKTİVLƏR ───────────────────────────────────────────

function getAssetSummary(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';

  const row = db.prepare(`
    SELECT COUNT(*) as total,
           COALESCE(SUM(purchase_price), 0) as total_cost,
           COALESCE(SUM(current_value), 0) as total_value
    FROM assets WHERE status = 'active' AND deleted_at IS NULL ${userFilter}
  `).get();

  return row || { total: 0, total_cost: 0, total_value: 0 };
}

// ─── TƏCHİZATÇILAR ─────────────────────────────────────

function getSupplierStats(userId) {
  const db = getDb();
  const userFilter = userId ? `AND (created_by = ${Number(userId)} OR created_by IS NULL)` : '';
  const row = db.prepare(`
    SELECT COUNT(*) as total FROM suppliers WHERE 1=1 ${userFilter}
  `).get();

  return { total: row?.total || 0 };
}

// ─── ÜMUMİ STATİSTİKA ───────────────────────────────────

function getDashboardSummary(userId) {
  const sales = getTodaySales(userId);
  const expenses = getTodayExpenses(userId);
  const tasks = getTodayTasks(userId);
  const appointments = getTodayAppointments(userId);
  const cash = getCashBalance(userId);
  const lowStock = getLowStockProducts(userId);
  const debtors = getDebtors(userId);
  const newCustomers = getNewCustomersToday(userId);

  return {
    sales, expenses, tasks, appointments, cash, lowStock, debtors, newCustomers, date: today()
  };
}

// ─── SƏRBƏSTAXTARİŞ (təhlükəsiz) ───────────────────────

const ALLOWED_TABLES = [
  'sales', 'sale_items', 'records', 'customers', 'products',
  'stock_movements', 'expenses', 'tasks', 'appointments',
  'finance_transactions', 'debt_payments', 'assets', 'suppliers',
  'categories', 'vehicles', 'notifications', 'price_base'
];

const FORBIDDEN_KEYWORDS = ['DELETE', 'DROP', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'REPLACE', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'REINDEX'];

function safeQuery(sql) {
  const upper = sql.toUpperCase().trim();
  if (!upper.startsWith('SELECT')) {
    return { success: false, error: 'Yalnız SELECT sorğuları icazəlidir' };
  }
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (upper.includes(kw)) {
      return { success: false, error: `"${kw}" sorğusu qadağandır` };
    }
  }
  // Check tables
  const tablePattern = /FROM\s+(\w+)/gi;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    if (!ALLOWED_TABLES.includes(match[1].toLowerCase())) {
      return { success: false, error: `"${match[1]}" cədvəlinə giriş qadağandır` };
    }
  }

  const joinPattern = /JOIN\s+(\w+)/gi;
  while ((match = joinPattern.exec(sql)) !== null) {
    if (!ALLOWED_TABLES.includes(match[1].toLowerCase())) {
      return { success: false, error: `"${match[1]}" cədvəlinə giriş qadağandır` };
    }
  }

  try {
    const db = getDb();
    const rows = db.prepare(sql).all();
    return { success: true, data: rows.slice(0, 100) }; // Max 100 nəticə
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  getTodaySales,
  getWeeklySales,
  getMonthlySales,
  getDebtors,
  getLowStockProducts,
  getTopSellingProducts,
  getProductStats,
  getNewCustomersToday,
  getCustomerStats,
  getTodayTasks,
  getOverdueTasks,
  getTodayExpenses,
  getMonthlyExpenses,
  getCashBalance,
  getTodayAppointments,
  getAssetSummary,
  getSupplierStats,
  getDashboardSummary,
  safeQuery,
  ALLOWED_TABLES,
};
