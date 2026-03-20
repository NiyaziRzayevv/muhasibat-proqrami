/**
 * DebtService - Borc əməliyyatlarının tam business logic-i
 * 
 * payDebt() daxilində:
 * 1. Validate payment
 * 2. Create debt_payment record
 * 3. Update debt totals/status
 * 4. Update sale/record paid_amount
 * 5. Create finance transaction (income)
 * 6. Audit log
 * 7. Return updated debt detail
 */
const { getDb } = require('../database/index');
const AuditService = require('./audit-service');
const NotificationService = require('./notification-service');

class DebtService {
  /**
   * Bütün borcları əldə et — debts cədvəlindən
   */
  static getAllDebts(filters = {}) {
    const db = getDb();
    let sql = `
      SELECT d.*, 
        c.name as customer_name, c.phone as customer_phone,
        s.sale_number, s.date as sale_date
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN sales s ON d.sale_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) { sql += ` AND d.status = ?`; params.push(filters.status); }
    if (filters.customer_id) { sql += ` AND d.customer_id = ?`; params.push(filters.customer_id); }
    if (filters.search) {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR s.sale_number LIKE ?)`;
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }
    if (filters.userId) { sql += ` AND d.created_by = ?`; params.push(filters.userId); }
    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0];
      sql += ` AND d.due_date IS NOT NULL AND d.due_date < ? AND d.status IN ('open','partial')`;
      params.push(today);
    }

    sql += ` ORDER BY d.created_at DESC`;
    if (filters.limit) { sql += ` LIMIT ? OFFSET ?`; params.push(filters.limit, filters.offset || 0); }

    return db.prepare(sql).all(...params);
  }

  /**
   * Borc detail — tam populated
   */
  static getDebtDetail(id) {
    const db = getDb();
    const debt = db.prepare(`
      SELECT d.*,
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        s.sale_number, s.date as sale_date, s.total as sale_total, s.payment_method as sale_payment_method
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN sales s ON d.sale_id = s.id
      WHERE d.id = ?
    `).get(id);
    if (!debt) return null;

    // Payments
    debt.payments = db.prepare(`
      SELECT dp.*, u.full_name as received_by_name
      FROM debt_payments dp
      LEFT JOIN users u ON dp.received_by = u.id
      WHERE (dp.debt_id_new = ? OR (dp.debt_type = 'sale' AND dp.debt_id = ?))
      ORDER BY dp.created_at DESC
    `).all(id, debt.sale_id || -1);

    // Finance transactions related
    debt.finance_transactions = db.prepare(`
      SELECT * FROM finance_transactions 
      WHERE (ref_type = 'debt' AND ref_id = ?) OR (ref_type = 'debt_payment' AND ref_id IN (SELECT id FROM debt_payments WHERE debt_id_new = ?))
      ORDER BY created_at DESC
    `).all(id, id);

    // Audit logs
    debt.audit_logs = db.prepare(`
      SELECT * FROM audit_logs WHERE entity_type = 'debt' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(id);

    return debt;
  }

  /**
   * Borc ödənişi — tam transaction ilə
   */
  static payDebt(data) {
    const db = getDb();
    const { debt_id, amount, payment_method, notes, created_by, received_by } = data;
    const payAmount = Number(amount);
    if (!debt_id || !payAmount || payAmount <= 0) throw new Error('Yanlış ödəniş parametrləri');

    const result = db.transaction(() => {
      // 1. Get debt
      const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(debt_id);
      if (!debt) throw new Error('Borc tapılmadı');
      if (debt.status === 'paid') throw new Error('Bu borc artıq ödənilib');

      const actualPay = Math.min(payAmount, debt.remaining_amount);
      const newPaid = debt.paid_amount + actualPay;
      const newRemaining = Math.max(0, debt.total_amount - newPaid);
      const newStatus = newRemaining <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'open');
      const today = new Date().toISOString().split('T')[0];

      // 2. Create debt payment
      const dpResult = db.prepare(`
        INSERT INTO debt_payments (debt_type, debt_id, debt_id_new, customer_id, amount, payment_method, notes, created_by, received_by, payment_date)
        VALUES ('debt', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(debt.sale_id || debt.record_id || debt_id, debt_id, debt.customer_id, actualPay, payment_method || 'cash', notes || null, created_by || null, received_by || created_by || null, today);

      // 3. Update debt
      db.prepare(`
        UPDATE debts SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(newPaid, newRemaining, newStatus, debt_id);

      // 4. Update related sale/record paid_amount
      if (debt.sale_id) {
        db.prepare(`UPDATE sales SET paid_amount = paid_amount + ?, remaining_amount = MAX(0, remaining_amount - ?), payment_status = ? WHERE id = ?`)
          .run(actualPay, actualPay, newStatus === 'paid' ? 'odenilib' : 'qismen', debt.sale_id);
      }
      if (debt.record_id) {
        db.prepare(`UPDATE records SET paid_amount = paid_amount + ?, remaining_amount = MAX(0, remaining_amount - ?), payment_status = ? WHERE id = ?`)
          .run(actualPay, actualPay, newStatus === 'paid' ? 'odenilib' : 'qismen', debt.record_id);
      }

      // 5. Finance transaction (income)
      db.prepare(`
        INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by)
        VALUES (?, 'income', 'Borc ödənişi', ?, ?, 'debt_payment', ?, ?, ?)
      `).run(today, actualPay, `Borc #${debt_id} ödənişi`, dpResult.lastInsertRowid, payment_method || 'cash', created_by || null);

      // 6. Notification
      const customer = debt.customer_id ? db.prepare('SELECT name FROM customers WHERE id = ?').get(debt.customer_id) : null;
      NotificationService.notifyDebtPaid(debt_id, customer?.name, actualPay, created_by);

      // 7. Audit
      AuditService.logPayment('debts', 'debt', debt_id, created_by, null, {
        amount: actualPay, new_paid: newPaid, new_remaining: newRemaining, new_status: newStatus, payment_method
      }, `Borc ödənişi: ${actualPay.toFixed(2)} ₼, qalıq: ${newRemaining.toFixed(2)} ₼`);

      return { payment_id: dpResult.lastInsertRowid, debt_id, amount: actualPay, new_paid: newPaid, new_remaining: newRemaining, new_status: newStatus };
    })();

    return result;
  }

  /**
   * Borc statistikaları
   */
  static getStats(userId = null) {
    const db = getDb();
    const uf = userId ? ` AND created_by = ?` : '';
    const params = userId ? [userId] : [];

    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as total_remaining,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM debts WHERE status != 'paid'${uf}
    `).get(...params);

    return totals;
  }
}

module.exports = DebtService;
