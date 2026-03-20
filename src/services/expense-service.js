/**
 * ExpenseService - Xərc əməliyyatlarının tam business logic-i
 * 
 * createExpense() daxilində:
 * 1. Validate input
 * 2. Create expense record
 * 3. Create finance transaction (expense)
 * 4. Audit log
 */
const { getDb } = require('../database/index');
const AuditService = require('./audit-service');

class ExpenseService {
  static createExpense(data) {
    const db = getDb();
    const result = db.transaction(() => {
      const date = data.date || data.expense_date || new Date().toISOString().split('T')[0];
      const userId = data.created_by || data.user_id || null;

      // 1. Create expense
      const expResult = db.prepare(`
        INSERT INTO expenses (date, category, title, description, amount, payment_method, reference, supplier_id, user_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        date, data.category || 'Digər', data.title || data.description || null,
        data.description || null, Number(data.amount) || 0,
        data.payment_method || 'cash', data.reference || null,
        data.supplier_id || null, userId, data.notes || null
      );
      const expenseId = expResult.lastInsertRowid;

      // 2. Finance transaction (expense)
      db.prepare(`
        INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by)
        VALUES (?, 'expense', ?, ?, ?, 'expense', ?, ?, ?)
      `).run(date, data.category || 'Digər', Number(data.amount) || 0,
        data.title || data.description || data.category, expenseId, data.payment_method || 'cash', userId);

      // 3. Audit
      AuditService.logCreate('expenses', 'expense', expenseId, userId, null, {
        category: data.category, amount: data.amount, title: data.title
      }, `Yeni xərc: ${data.title || data.category} - ${Number(data.amount).toFixed(2)} ₼`);

      return expenseId;
    })();

    return db.prepare('SELECT * FROM expenses WHERE id = ?').get(result);
  }

  static updateExpense(id, data) {
    const db = getDb();
    const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!old) throw new Error('Xərc tapılmadı');

    db.transaction(() => {
      const fields = ['date', 'category', 'title', 'description', 'amount', 'payment_method', 'reference', 'supplier_id', 'notes'];
      const setClauses = fields.filter(f => data[f] !== undefined).map(f => `${f} = ?`);
      if (!setClauses.length) return;
      setClauses.push("updated_at = datetime('now','localtime')");
      const values = fields.filter(f => data[f] !== undefined).map(f => data[f]);
      values.push(id);
      db.prepare(`UPDATE expenses SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

      // Update related finance transaction
      if (data.amount !== undefined || data.category !== undefined) {
        db.prepare(`
          UPDATE finance_transactions SET amount = ?, category = ?, description = ?
          WHERE ref_type = 'expense' AND ref_id = ?
        `).run(
          data.amount !== undefined ? Number(data.amount) : old.amount,
          data.category || old.category,
          data.title || data.description || old.title || old.description || old.category,
          id
        );
      }

      AuditService.logUpdate('expenses', 'expense', id, data.user_id, null, old, data, `Xərc yeniləndi: #${id}`);
    })();

    return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
  }

  static deleteExpense(id, userId = null) {
    const db = getDb();
    const old = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!old) throw new Error('Xərc tapılmadı');

    db.transaction(() => {
      db.prepare("UPDATE expenses SET deleted_at = datetime('now','localtime') WHERE id = ?").run(id);
      db.prepare("DELETE FROM finance_transactions WHERE ref_type = 'expense' AND ref_id = ?").run(id);
      AuditService.logDelete('expenses', 'expense', id, userId, null, old, `Xərc silindi: ${old.title || old.category}`);
    })();

    return { success: true };
  }

  static getExpenseDetail(id) {
    const db = getDb();
    const expense = db.prepare(`
      SELECT e.*, s.name as supplier_name, u.full_name as created_by_name
      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `).get(id);
    if (!expense) return null;

    expense.finance_transaction = db.prepare(`
      SELECT * FROM finance_transactions WHERE ref_type = 'expense' AND ref_id = ?
    `).get(id);

    expense.audit_logs = db.prepare(`
      SELECT * FROM audit_logs WHERE entity_type = 'expense' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).all(id);

    return expense;
  }
}

module.exports = ExpenseService;
