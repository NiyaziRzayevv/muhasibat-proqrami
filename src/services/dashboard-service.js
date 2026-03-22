/**
 * DashboardService - Real hesablanmış dashboard məlumatları
 * Heç bir fake/static data yoxdur - hamısı real query ilə gəlir
 */
const { getDb } = require('../database/index');

class DashboardService {
  static getAll(userId = null) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const monthStart = `${year}-${month}-01`;
    const uf = userId ? ' AND created_by = ?' : '';
    const ufSold = userId ? ' AND sold_by = ?' : '';
    const ufUser = userId ? ' AND user_id = ?' : '';
    const p = userId ? [userId] : [];

    // ─── Revenue ─────────────────────────────────────────────────────
    const todayIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions 
      WHERE type = 'income' AND date = ?${uf}
    `).get(today, ...p).total;

    const monthIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions 
      WHERE type = 'income' AND date >= ?${uf}
    `).get(monthStart, ...p).total;

    const totalIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions 
      WHERE type = 'income'${uf}
    `).get(...p).total;

    // ─── Expenses ────────────────────────────────────────────────────
    const todayExpense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions 
      WHERE type = 'expense' AND date = ?${uf}
    `).get(today, ...p).total;

    const monthExpense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions 
      WHERE type = 'expense' AND date >= ?${uf}
    `).get(monthStart, ...p).total;

    // ─── Sales ───────────────────────────────────────────────────────
    const todaySales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales 
      WHERE date = ?${ufSold}
    `).get(today, ...p);

    const monthSales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales 
      WHERE date >= ?${ufSold}
    `).get(monthStart, ...p);

    // ─── Debts ───────────────────────────────────────────────────────
    const unpaidDebts = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(remaining_amount), 0) as total 
      FROM debts WHERE status IN ('open', 'partial', 'overdue')${uf}
    `).get(...p);

    // ─── Customers ───────────────────────────────────────────────────
    const customerCount = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE 1=1${uf}`).get(...p).count;

    // ─── Stock ───────────────────────────────────────────────────────
    const stockValue = db.prepare(`
      SELECT 
        COALESCE(SUM(stock_qty * buy_price), 0) as buy_value,
        COALESCE(SUM(stock_qty * sell_price), 0) as sell_value,
        COUNT(*) as product_count
      FROM products WHERE is_active = 1
    `).get();

    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count FROM products 
      WHERE stock_qty <= min_stock AND min_stock > 0 AND is_active = 1
    `).get().count;

    // ─── Appointments ────────────────────────────────────────────────
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const upcomingAppointments = db.prepare(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone
      FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id
      WHERE a.date >= ? AND a.date <= ? AND a.status IN ('pending', 'confirmed')${userId ? ' AND a.created_by = ?' : ''}
      ORDER BY a.date, a.time LIMIT 5
    `).all(today, tomorrow, ...p);

    // ─── Tasks ───────────────────────────────────────────────────────
    const ufTask = userId ? ' AND created_by = ?' : '';
    const activeTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE status NOT IN ('done', 'cancelled')${ufTask}
    `).get(...p).count;

    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE status NOT IN ('done', 'cancelled') AND due_date IS NOT NULL AND due_date < ?${ufTask}
    `).get(today, ...p).count;

    // ─── Recent transactions ─────────────────────────────────────────
    const recentTransactions = db.prepare(`
      SELECT * FROM finance_transactions WHERE 1=1${uf}
      ORDER BY created_at DESC LIMIT 10
    `).all(...p);

    // ─── Top selling products ────────────────────────────────────────
    const topProducts = db.prepare(`
      SELECT si.product_name, SUM(si.qty) as total_qty, SUM(si.total) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.date >= ?${ufSold}
      GROUP BY si.product_name
      ORDER BY total_qty DESC LIMIT 5
    `).all(monthStart, ...p);

    // ─── Monthly revenue chart ───────────────────────────────────────
    const monthlyChart = db.prepare(`
      SELECT strftime('%m', date) as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM finance_transactions
      WHERE strftime('%Y', date) = ?${uf}
      GROUP BY month ORDER BY month
    `).all(String(year), ...p);

    // ─── Low stock products list ─────────────────────────────────────
    const lowStockProducts = db.prepare(`
      SELECT id, name, stock_qty, min_stock, unit FROM products 
      WHERE stock_qty <= min_stock AND min_stock > 0 AND is_active = 1
      ORDER BY stock_qty ASC LIMIT 5
    `).all();

    return {
      // Revenue cards
      today_income: todayIncome,
      month_income: monthIncome,
      total_income: totalIncome,
      today_expense: todayExpense,
      month_expense: monthExpense,
      net_profit: monthIncome - monthExpense,

      // Sales
      today_sales_count: todaySales.count,
      today_sales_total: todaySales.total,
      month_sales_count: monthSales.count,
      month_sales_total: monthSales.total,

      // Debts
      unpaid_count: unpaidDebts.count,
      unpaid_total: unpaidDebts.total,

      // Customers
      customer_count: customerCount,

      // Stock
      stock_buy_value: stockValue.buy_value,
      stock_sell_value: stockValue.sell_value,
      product_count: stockValue.product_count,
      low_stock_count: lowStockCount,
      low_stock_products: lowStockProducts,

      // Tasks & Appointments
      active_tasks: activeTasks,
      overdue_tasks: overdueTasks,
      upcoming_appointments: upcomingAppointments,

      // Charts & lists
      recent_transactions: recentTransactions,
      top_products: topProducts,
      monthly_chart: monthlyChart,
    };
  }
}

module.exports = DashboardService;
