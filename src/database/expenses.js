const { getDb } = require('./index');

const EXPENSE_CATEGORIES = [
  'İcarə', 'Maaş', 'Material', 'Nəqliyyat', 'Reklam',
  'Kommunal', 'Texnika', 'Sığorta', 'Vergi', 'Digər'
];

function getAllExpenses(filters = {}) {
  const db = getDb();
  let query = `SELECT * FROM expenses WHERE deleted_at IS NULL`;
  const params = [];

  if (filters.userId) { query += ` AND user_id = ?`; params.push(filters.userId); }
  if (filters.startDate) { query += ` AND date >= ?`; params.push(filters.startDate); }
  if (filters.endDate) { query += ` AND date <= ?`; params.push(filters.endDate); }
  if (filters.category) { query += ` AND category = ?`; params.push(filters.category); }
  if (filters.search) {
    query += ` AND (LOWER(description) LIKE ? OR LOWER(category) LIKE ?)`;
    params.push(`%${filters.search.toLowerCase()}%`, `%${filters.search.toLowerCase()}%`);
  }

  query += ` ORDER BY date DESC, id DESC`;
  if (filters.limit) { query += ` LIMIT ? OFFSET ?`; params.push(filters.limit, filters.offset || 0); }

  return db.prepare(query).all(...params);
}

function getExpenseById(id) {
  return getDb().prepare(`SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL`).get(id);
}

function createExpense(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO expenses (date, category, description, amount, payment_method, reference, user_id, notes)
    VALUES (@date, @category, @description, @amount, @payment_method, @reference, @user_id, @notes)
  `);
  const result = stmt.run({
    date: data.date || new Date().toISOString().split('T')[0],
    category: data.category || 'Digər',
    description: data.description || null,
    amount: data.amount || 0,
    payment_method: data.payment_method || 'cash',
    reference: data.reference || null,
    user_id: data.user_id || null,
    notes: data.notes || null,
  });
  return getExpenseById(result.lastInsertRowid);
}

function updateExpense(id, data) {
  const db = getDb();
  const existing = getExpenseById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  db.prepare(`
    UPDATE expenses SET date=@date, category=@category, description=@description,
    amount=@amount, payment_method=@payment_method, notes=@notes,
    updated_at=datetime('now','localtime') WHERE id=@id
  `).run({ ...merged, id });
  return getExpenseById(id);
}

function deleteExpense(id, userId = null) {
  const db = getDb();
  if (userId) return db.prepare(`UPDATE expenses SET deleted_at=datetime('now','localtime') WHERE id=? AND user_id=?`).run(id, userId).changes > 0;
  return db.prepare(`UPDATE expenses SET deleted_at=datetime('now','localtime') WHERE id=?`).run(id).changes > 0;
}

function getExpenseStats(startDate, endDate, userId = null) {
  const db = getDb();
  let where = `WHERE deleted_at IS NULL`;
  const params = [];
  if (userId) { where += ` AND user_id = ?`; params.push(userId); }
  if (startDate) { where += ` AND date >= ?`; params.push(startDate); }
  if (endDate) { where += ` AND date <= ?`; params.push(endDate); }

  const total = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses ${where}`).get(...params);
  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count
    FROM expenses ${where}
    GROUP BY category ORDER BY total DESC
  `).all(...params);
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount),0) as total
    FROM expenses ${where}
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all(...params);

  return { total: total.total, byCategory, monthly };
}

function getTodayExpenses(userId = null) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  if (userId) return db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date=? AND deleted_at IS NULL AND user_id=?`).get(today, userId);
  return db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date=? AND deleted_at IS NULL`).get(today);
}

function getMonthExpenses(year, month, userId = null) {
  const db = getDb();
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = `${year}-${String(month).padStart(2,'0')}-31`;
  if (userId) return db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date BETWEEN ? AND ? AND deleted_at IS NULL AND user_id=?`).get(start, end, userId);
  return db.prepare(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date BETWEEN ? AND ? AND deleted_at IS NULL`).get(start, end);
}

module.exports = { getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getExpenseStats, getTodayExpenses, getMonthExpenses, EXPENSE_CATEGORIES };
