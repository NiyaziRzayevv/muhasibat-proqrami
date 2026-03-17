const { getDb } = require('./index');

function getAllFinanceTransactions(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM finance_transactions WHERE 1=1';
  const params = [];

  if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
  if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
  if (filters.startDate) { sql += ' AND date >= ?'; params.push(filters.startDate); }
  if (filters.endDate) { sql += ' AND date <= ?'; params.push(filters.endDate); }
  if (filters.userId) { sql += ' AND created_by = ?'; params.push(filters.userId); }

  sql += ' ORDER BY created_at DESC';
  if (filters.limit) { sql += ' LIMIT ?'; params.push(parseInt(filters.limit)); }

  return db.prepare(sql).all(...params);
}

function createFinanceTransaction(data) {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    data.date || new Date().toISOString().split('T')[0],
    data.type || 'income',
    data.category || null,
    Number(data.amount || 0),
    data.description || null,
    data.ref_type || null,
    data.ref_id || null,
    data.payment_method || 'cash',
    data.created_by || null
  );
  return db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(info.lastInsertRowid);
}

function deleteFinanceTransaction(id) {
  const db = getDb();
  db.prepare('DELETE FROM finance_transactions WHERE id = ?').run(id);
  return { deleted: true };
}

function getFinanceSummary(filters = {}) {
  const db = getDb();
  const { startDate, endDate, userId } = filters;
  const dateWhere = (startDate && endDate) ? ' AND date >= ? AND date <= ?' : '';
  const userWhere = userId ? ' AND created_by = ?' : '';
  const params = [];
  if (startDate && endDate) params.push(startDate, endDate);
  if (userId) params.push(parseInt(userId));

  // Records income
  const recSql = `SELECT COALESCE(SUM(total_price), 0) as total, COALESCE(SUM(paid_amount), 0) as paid, COUNT(*) as cnt FROM records WHERE 1=1${dateWhere}${userWhere}`;
  const rec = db.prepare(recSql).get(...params);

  // Sales income
  const saleSql = `SELECT COALESCE(SUM(total), 0) as total, COALESCE(SUM(paid_amount), 0) as paid, COUNT(*) as cnt FROM sales WHERE 1=1${dateWhere}${userWhere}`;
  const sale = db.prepare(saleSql).get(...params);

  // Expenses
  const expParams = [];
  if (startDate && endDate) expParams.push(startDate, endDate);
  if (userId) expParams.push(parseInt(userId));
  const expSql = `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM expenses WHERE deleted_at IS NULL${dateWhere}${userId ? ' AND user_id = ?' : ''}`;
  const exp = db.prepare(expSql).get(...expParams);

  // Manual finance transactions
  const ftParams = [];
  if (startDate && endDate) ftParams.push(startDate, endDate);
  if (userId) ftParams.push(parseInt(userId));
  const ftIncome = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'income'${dateWhere}${userWhere}`).get(...ftParams);
  const ftExpense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'expense'${dateWhere}${userWhere}`).get(...ftParams);

  const totalIncome = (rec.total || 0) + (sale.total || 0) + (ftIncome.total || 0);
  const totalExpense = (exp.total || 0) + (ftExpense.total || 0);
  const totalPaid = (rec.paid || 0) + (sale.paid || 0);
  const totalDebt = totalIncome - totalPaid;

  // Expense by category
  const catParams = [];
  if (startDate && endDate) catParams.push(startDate, endDate);
  if (userId) catParams.push(parseInt(userId));
  const categories = db.prepare(`SELECT category, SUM(amount) as total FROM expenses WHERE deleted_at IS NULL${dateWhere}${userId ? ' AND user_id = ?' : ''} GROUP BY category ORDER BY total DESC`).all(...catParams);

  return {
    total_income: totalIncome,
    records_income: rec.total || 0,
    sales_income: sale.total || 0,
    manual_income: ftIncome.total || 0,
    total_expense: totalExpense,
    manual_expense: ftExpense.total || 0,
    net_profit: totalIncome - totalExpense,
    total_paid: totalPaid,
    total_debt: Math.max(0, totalDebt),
    cash_balance: totalPaid - totalExpense,
    record_count: rec.cnt || 0,
    sale_count: sale.cnt || 0,
    expense_count: exp.cnt || 0,
    expense_by_category: categories,
  };
}

module.exports = { getAllFinanceTransactions, createFinanceTransaction, deleteFinanceTransaction, getFinanceSummary };
