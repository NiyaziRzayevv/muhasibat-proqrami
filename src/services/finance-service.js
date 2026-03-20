/**
 * FinanceService - Maliyyə hesabatları və konsolidasiya
 * Gəlir/xərc balansı, kateqoriya analizi, trend, cash flow
 */
const { getDb } = require('../database/index');

class FinanceService {
  /**
   * Ümumi maliyyə xülasəsi — real data
   */
  static getSummary(startDate, endDate, userId) {
    const db = getDb();
    const now = new Date();
    const start = startDate || `${now.getFullYear()}-01-01`;
    const end = endDate || now.toISOString().split('T')[0];

    // Income from finance_transactions
    const income = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM finance_transactions
      WHERE type = 'income' AND date BETWEEN ? AND ?
      ${userId ? 'AND created_by = ?' : ''}
    `).get(...(userId ? [start, end, userId] : [start, end]));

    // Expenses from finance_transactions
    const expense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM finance_transactions
      WHERE type = 'expense' AND date BETWEEN ? AND ?
      ${userId ? 'AND created_by = ?' : ''}
    `).get(...(userId ? [start, end, userId] : [start, end]));

    // Direct from sales (paid)
    const salesIncome = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as count
      FROM sales WHERE date BETWEEN ? AND ?
      ${userId ? 'AND (created_by = ? OR sold_by = ?)' : ''}
    `).get(...(userId ? [start, end, userId, userId] : [start, end]));

    // Direct from expenses table
    const directExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses WHERE date BETWEEN ? AND ? AND deleted_at IS NULL
      ${userId ? 'AND user_id = ?' : ''}
    `).get(...(userId ? [start, end, userId] : [start, end]));

    // Outstanding debts
    const debts = db.prepare(`
      SELECT COALESCE(SUM(remaining_amount), 0) as total, COUNT(*) as count
      FROM debts WHERE status IN ('open', 'partial', 'overdue')
    `).get();

    const netIncome = (income.total || 0) - (expense.total || 0);

    return {
      income: income.total || 0,
      income_count: income.count || 0,
      expense: expense.total || 0,
      expense_count: expense.count || 0,
      net: netIncome,
      profit_margin: income.total > 0 ? ((netIncome / income.total) * 100).toFixed(1) : 0,
      sales_income: salesIncome.total || 0,
      sales_count: salesIncome.count || 0,
      direct_expenses: directExpenses.total || 0,
      outstanding_debt: debts.total || 0,
      outstanding_debt_count: debts.count || 0,
      period: { start, end },
    };
  }

  /**
   * Kateqoriya üzrə xərclər
   */
  static getExpensesByCategory(startDate, endDate, userId) {
    const db = getDb();
    const now = new Date();
    const start = startDate || `${now.getFullYear()}-01-01`;
    const end = endDate || now.toISOString().split('T')[0];

    return db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE date BETWEEN ? AND ? AND deleted_at IS NULL
      ${userId ? 'AND user_id = ?' : ''}
      GROUP BY category
      ORDER BY total DESC
    `).all(...(userId ? [start, end, userId] : [start, end]));
  }

  /**
   * Aylıq gəlir/xərc trendi
   */
  static getMonthlyTrend(year, userId) {
    const db = getDb();
    const y = year || new Date().getFullYear();

    const incomeByMonth = db.prepare(`
      SELECT strftime('%m', date) as month, COALESCE(SUM(amount), 0) as total
      FROM finance_transactions
      WHERE type = 'income' AND strftime('%Y', date) = ?
      ${userId ? 'AND created_by = ?' : ''}
      GROUP BY strftime('%m', date)
    `).all(...(userId ? [String(y), userId] : [String(y)]));

    const expenseByMonth = db.prepare(`
      SELECT strftime('%m', date) as month, COALESCE(SUM(amount), 0) as total
      FROM finance_transactions
      WHERE type = 'expense' AND strftime('%Y', date) = ?
      ${userId ? 'AND created_by = ?' : ''}
      GROUP BY strftime('%m', date)
    `).all(...(userId ? [String(y), userId] : [String(y)]));

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const inc = incomeByMonth.find(r => r.month === mm);
      const exp = expenseByMonth.find(r => r.month === mm);
      months.push({
        month: mm,
        income: inc?.total || 0,
        expense: exp?.total || 0,
        net: (inc?.total || 0) - (exp?.total || 0),
      });
    }
    return months;
  }

  /**
   * Ödəniş metodu statistikası
   */
  static getPaymentMethodStats(startDate, endDate, userId) {
    const db = getDb();
    const now = new Date();
    const start = startDate || `${now.getFullYear()}-01-01`;
    const end = endDate || now.toISOString().split('T')[0];

    return db.prepare(`
      SELECT payment_method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM finance_transactions
      WHERE date BETWEEN ? AND ?
      ${userId ? 'AND created_by = ?' : ''}
      GROUP BY payment_method
      ORDER BY total DESC
    `).all(...(userId ? [start, end, userId] : [start, end]));
  }

  /**
   * Son maliyyə əməliyyatları
   */
  static getRecentTransactions(limit, userId) {
    const db = getDb();
    return db.prepare(`
      SELECT ft.*, u.full_name as created_by_name
      FROM finance_transactions ft
      LEFT JOIN users u ON ft.created_by = u.id
      ${userId ? 'WHERE ft.created_by = ?' : ''}
      ORDER BY ft.date DESC, ft.created_at DESC
      LIMIT ?
    `).all(...(userId ? [userId, limit || 20] : [limit || 20]));
  }

  /**
   * Günlük cash flow (bu ay)
   */
  static getDailyCashFlow(year, month, userId) {
    const db = getDb();
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    const mm = String(m).padStart(2, '0');

    const rows = db.prepare(`
      SELECT date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM finance_transactions
      WHERE strftime('%Y-%m', date) = ?
      ${userId ? 'AND created_by = ?' : ''}
      GROUP BY date
      ORDER BY date
    `).all(...(userId ? [`${y}-${mm}`, userId] : [`${y}-${mm}`]));

    let balance = 0;
    return rows.map(r => {
      balance += (r.income || 0) - (r.expense || 0);
      return { ...r, net: (r.income || 0) - (r.expense || 0), running_balance: balance };
    });
  }
}

module.exports = FinanceService;
