/**
 * CustomerService - Müştəri əməliyyatları və tam detail
 * Customer detail: profil, vehicles, sales, debts, payments, appointments, tasks, notes, timeline
 */
const { getDb } = require('../database/index');
const AuditService = require('./audit-service');

class CustomerService {
  static getCustomerDetail(id) {
    const db = getDb();
    const customer = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.customer_id = c.id) as total_spent,
        (SELECT COALESCE(SUM(d.remaining_amount), 0) FROM debts d WHERE d.customer_id = c.id AND d.status IN ('open','partial','overdue')) as total_debt,
        (SELECT MAX(s.date) FROM sales s WHERE s.customer_id = c.id) as last_sale_date
      FROM customers c WHERE c.id = ?
    `).get(id);
    if (!customer) return null;

    // Vehicles
    customer.vehicles = db.prepare(`SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at DESC`).all(id);

    // Sales
    customer.sales = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
      FROM sales s WHERE s.customer_id = ? ORDER BY s.date DESC LIMIT 50
    `).all(id);

    // Debts (open/partial)
    customer.debts = db.prepare(`
      SELECT d.*, s.sale_number FROM debts d LEFT JOIN sales s ON d.sale_id = s.id
      WHERE d.customer_id = ? AND d.status IN ('open','partial','overdue')
      ORDER BY d.created_at DESC
    `).all(id);

    // Debt payments
    customer.payments = db.prepare(`
      SELECT dp.*, u.full_name as received_by_name
      FROM debt_payments dp LEFT JOIN users u ON dp.received_by = u.id
      WHERE dp.customer_id = ?
      ORDER BY dp.created_at DESC LIMIT 30
    `).all(id);

    // Appointments
    customer.appointments = db.prepare(`
      SELECT * FROM appointments WHERE customer_id = ? ORDER BY date DESC LIMIT 20
    `).all(id);

    // Tasks
    customer.tasks = db.prepare(`
      SELECT * FROM tasks WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(id);

    // Notes
    customer.notes_list = db.prepare(`
      SELECT n.*, u.full_name as created_by_name
      FROM notes n LEFT JOIN users u ON n.created_by = u.id
      WHERE n.customer_id = ? ORDER BY n.created_at DESC LIMIT 30
    `).all(id);

    // Records (legacy)
    customer.records = db.prepare(`
      SELECT * FROM records WHERE customer_id = ? ORDER BY date DESC LIMIT 30
    `).all(id);

    return customer;
  }

  /**
   * Müştəri timeline — bütün əlaqəli hadisələr xronoloji sıra ilə
   */
  static getTimeline(customerId, limit = 50) {
    const db = getDb();
    const events = [];

    // Sales
    const sales = db.prepare(`SELECT id, date, sale_number, total, payment_status, created_at FROM sales WHERE customer_id = ? ORDER BY date DESC LIMIT ?`).all(customerId, limit);
    for (const s of sales) {
      events.push({ type: 'sale', date: s.date || s.created_at, title: `Satış ${s.sale_number}`, description: `${Number(s.total).toFixed(2)} ₼ - ${s.payment_status}`, reference_id: s.id, reference_type: 'sale' });
    }

    // Debt payments
    const payments = db.prepare(`SELECT dp.id, dp.amount, dp.payment_method, dp.payment_date, dp.created_at FROM debt_payments dp WHERE dp.customer_id = ? ORDER BY dp.created_at DESC LIMIT ?`).all(customerId, limit);
    for (const p of payments) {
      events.push({ type: 'payment', date: p.payment_date || p.created_at, title: 'Borc ödənişi', description: `${Number(p.amount).toFixed(2)} ₼ (${p.payment_method})`, reference_id: p.id, reference_type: 'debt_payment' });
    }

    // Debts created
    const debts = db.prepare(`SELECT id, total_amount, status, created_at FROM debts WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`).all(customerId, limit);
    for (const d of debts) {
      events.push({ type: 'debt', date: d.created_at, title: 'Borc yarandı', description: `${Number(d.total_amount).toFixed(2)} ₼ - ${d.status}`, reference_id: d.id, reference_type: 'debt' });
    }

    // Appointments
    const appointments = db.prepare(`SELECT id, title, date, status, created_at FROM appointments WHERE customer_id = ? ORDER BY date DESC LIMIT ?`).all(customerId, limit);
    for (const a of appointments) {
      events.push({ type: 'appointment', date: a.date || a.created_at, title: `Randevu: ${a.title}`, description: `Status: ${a.status}`, reference_id: a.id, reference_type: 'appointment' });
    }

    // Tasks
    const tasks = db.prepare(`SELECT id, title, status, created_at FROM tasks WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`).all(customerId, limit);
    for (const t of tasks) {
      events.push({ type: 'task', date: t.created_at, title: `Tapşırıq: ${t.title}`, description: `Status: ${t.status}`, reference_id: t.id, reference_type: 'task' });
    }

    // Notes
    const notes = db.prepare(`SELECT id, title, content, created_at FROM notes WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`).all(customerId, limit);
    for (const n of notes) {
      events.push({ type: 'note', date: n.created_at, title: n.title || 'Qeyd', description: n.content?.substring(0, 100) || '', reference_id: n.id, reference_type: 'note' });
    }

    // Records (legacy)
    const records = db.prepare(`SELECT id, date, service_type, total_price, payment_status, created_at FROM records WHERE customer_id = ? ORDER BY date DESC LIMIT ?`).all(customerId, limit);
    for (const r of records) {
      events.push({ type: 'record', date: r.date || r.created_at, title: `Servis: ${r.service_type || 'Qeyd'}`, description: `${Number(r.total_price || 0).toFixed(2)} ₼`, reference_id: r.id, reference_type: 'record' });
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return events.slice(0, limit);
  }

  static createCustomer(data) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO customers (name, phone, email, address, notes, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.name || null, data.phone || null, data.email || null, data.address || null, data.notes || null, data.status || 'active', data.created_by || null);
    const customer = this.getCustomerDetail(result.lastInsertRowid);
    AuditService.logCreate('customers', 'customer', result.lastInsertRowid, data.created_by, null, { name: data.name, phone: data.phone }, `Yeni müştəri: ${data.name}`);
    return customer;
  }

  static updateCustomer(id, data) {
    const db = getDb();
    const old = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!old) throw new Error('Müştəri tapılmadı');
    const fields = ['name', 'phone', 'email', 'address', 'notes', 'status'];
    const setClauses = fields.filter(f => data[f] !== undefined).map(f => `${f} = ?`);
    if (!setClauses.length) return this.getCustomerDetail(id);
    setClauses.push("updated_at = datetime('now','localtime')");
    const values = fields.filter(f => data[f] !== undefined).map(f => data[f]);
    values.push(id);
    db.prepare(`UPDATE customers SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    AuditService.logUpdate('customers', 'customer', id, data.created_by, null, old, data, `Müştəri yeniləndi: ${data.name || old.name}`);
    return this.getCustomerDetail(id);
  }

  static deleteCustomer(id, userId) {
    const db = getDb();
    const old = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!old) throw new Error('Müştəri tapılmadı');
    db.transaction(() => {
      db.prepare('UPDATE records SET customer_id = NULL WHERE customer_id = ?').run(id);
      db.prepare('UPDATE sales SET customer_id = NULL WHERE customer_id = ?').run(id);
      db.prepare('UPDATE vehicles SET customer_id = NULL WHERE customer_id = ?').run(id);
      db.prepare('UPDATE debts SET customer_id = NULL WHERE customer_id = ?').run(id);
      db.prepare('UPDATE appointments SET customer_id = NULL WHERE customer_id = ?').run(id);
      db.prepare('UPDATE tasks SET customer_id = NULL WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    })();
    AuditService.logDelete('customers', 'customer', id, userId, null, old, `Müştəri silindi: ${old.name}`);
    return { success: true };
  }
}

module.exports = CustomerService;
