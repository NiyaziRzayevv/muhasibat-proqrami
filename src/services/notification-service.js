/**
 * NotificationService - Avtomatik bildiriş yaradır
 * Stok azalma, borc xəbərdarlığı, randevu yaxınlaşma, task deadline
 */
const { getDb } = require('../database/index');

class NotificationService {
  static create({ type, title, message, reference_type, reference_id, user_id, data }) {
    try {
      const db = getDb();
      const result = db.prepare(`
        INSERT INTO notifications (type, title, message, data, reference_type, reference_id, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        type || 'info',
        title,
        message || null,
        data ? JSON.stringify(data) : '{}',
        reference_type || null,
        reference_id || null,
        user_id || null
      );
      return result.lastInsertRowid;
    } catch (e) {
      console.error('[NotificationService] create error:', e.message);
      return null;
    }
  }

  static notifyLowStock(productId, productName, currentQty, minStock, userId) {
    const db = getDb();
    // Don't duplicate unread low_stock for same product
    const existing = db.prepare(`
      SELECT id FROM notifications 
      WHERE type = 'low_stock' AND reference_type = 'product' AND reference_id = ? AND is_read = 0
    `).get(productId);
    if (existing) return null;

    return this.create({
      type: 'low_stock',
      title: 'Stok Xəbərdarlığı',
      message: `"${productName}" stoku ${currentQty} ədədə düşdü (minimum: ${minStock})`,
      reference_type: 'product',
      reference_id: productId,
      user_id: userId,
      data: { product_id: productId, current_qty: currentQty, min_stock: minStock },
    });
  }

  static notifyNewSale(saleId, total, customerName, userId) {
    return this.create({
      type: 'new_sale',
      title: 'Yeni Satış',
      message: `${customerName || 'Qonaq'} - ${Number(total).toFixed(2)} ₼ satış qeydə alındı`,
      reference_type: 'sale',
      reference_id: saleId,
      user_id: userId,
    });
  }

  static notifyDebtCreated(debtId, customerName, amount, userId) {
    return this.create({
      type: 'debt_created',
      title: 'Yeni Borc',
      message: `${customerName || 'Naməlum'} - ${Number(amount).toFixed(2)} ₼ borc yarandı`,
      reference_type: 'debt',
      reference_id: debtId,
      user_id: userId,
    });
  }

  static notifyDebtPaid(debtId, customerName, amount, userId) {
    return this.create({
      type: 'debt_paid',
      title: 'Borc Ödənişi',
      message: `${customerName || 'Naməlum'} - ${Number(amount).toFixed(2)} ₼ ödəniş alındı`,
      reference_type: 'debt',
      reference_id: debtId,
      user_id: userId,
    });
  }

  static notifyOverdueDebt(debtId, customerName, amount, dueDate, userId) {
    const db = getDb();
    const existing = db.prepare(`
      SELECT id FROM notifications 
      WHERE type = 'overdue_debt' AND reference_type = 'debt' AND reference_id = ? AND is_read = 0
    `).get(debtId);
    if (existing) return null;

    return this.create({
      type: 'overdue_debt',
      title: 'Gecikmiş Borc',
      message: `${customerName || 'Naməlum'} - ${Number(amount).toFixed(2)} ₼ borc ${dueDate} tarixindən keçib`,
      reference_type: 'debt',
      reference_id: debtId,
      user_id: userId,
    });
  }

  static notifyUpcomingAppointment(appointmentId, title, date, userId) {
    const db = getDb();
    const existing = db.prepare(`
      SELECT id FROM notifications 
      WHERE type = 'upcoming_appointment' AND reference_type = 'appointment' AND reference_id = ? AND is_read = 0
    `).get(appointmentId);
    if (existing) return null;

    return this.create({
      type: 'upcoming_appointment',
      title: 'Yaxın Randevu',
      message: `"${title}" - ${date}`,
      reference_type: 'appointment',
      reference_id: appointmentId,
      user_id: userId,
    });
  }

  static notifyTaskOverdue(taskId, title, dueDate, userId) {
    const db = getDb();
    const existing = db.prepare(`
      SELECT id FROM notifications 
      WHERE type = 'task_overdue' AND reference_type = 'task' AND reference_id = ? AND is_read = 0
    `).get(taskId);
    if (existing) return null;

    return this.create({
      type: 'task_overdue',
      title: 'Gecikmiş Tapşırıq',
      message: `"${title}" - son tarix ${dueDate} keçib`,
      reference_type: 'task',
      reference_id: taskId,
      user_id: userId,
    });
  }

  /**
   * Sistem yoxlaması - bütün avtomatik bildirişləri yoxla
   */
  static checkAll(userId) {
    const results = [];
    try {
      const db = getDb();
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // 1. Low stock products
      const lowStockProducts = db.prepare(`
        SELECT id, name, stock_qty, min_stock FROM products 
        WHERE stock_qty <= min_stock AND min_stock > 0 AND is_active = 1
      `).all();
      for (const p of lowStockProducts) {
        const r = this.notifyLowStock(p.id, p.name, p.stock_qty, p.min_stock, userId);
        if (r) results.push('low_stock');
      }

      // 2. Overdue debts
      const overdueDebts = db.prepare(`
        SELECT d.id, d.remaining_amount, d.due_date, c.name as customer_name
        FROM debts d LEFT JOIN customers c ON d.customer_id = c.id
        WHERE d.status IN ('open', 'partial') AND d.due_date IS NOT NULL AND d.due_date < ?
      `).all(today);
      for (const d of overdueDebts) {
        const r = this.notifyOverdueDebt(d.id, d.customer_name, d.remaining_amount, d.due_date, userId);
        if (r) results.push('overdue_debt');
        // Also update debt status to overdue
        db.prepare(`UPDATE debts SET status = 'overdue' WHERE id = ? AND status != 'overdue'`).run(d.id);
      }

      // 3. Upcoming appointments (today + tomorrow)
      const upcoming = db.prepare(`
        SELECT id, title, date FROM appointments 
        WHERE date >= ? AND date <= ? AND status IN ('pending', 'confirmed')
      `).all(today, tomorrow);
      for (const a of upcoming) {
        const r = this.notifyUpcomingAppointment(a.id, a.title, a.date, userId);
        if (r) results.push('upcoming_appointment');
      }

      // 4. Overdue tasks
      const overdueTasks = db.prepare(`
        SELECT id, title, due_date FROM tasks 
        WHERE status NOT IN ('done', 'cancelled') AND due_date IS NOT NULL AND due_date < ?
      `).all(today);
      for (const t of overdueTasks) {
        const r = this.notifyTaskOverdue(t.id, t.title, t.due_date, userId);
        if (r) results.push('task_overdue');
      }
    } catch (e) {
      console.error('[NotificationService] checkAll error:', e.message);
    }
    return results;
  }
}

module.exports = NotificationService;
