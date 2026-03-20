/**
 * SalesService - Satış əməliyyatlarının tam business logic-i
 * 
 * createSale() daxilində:
 * 1. Input validation
 * 2. Stok yoxlaması
 * 3. Sale yaratma + sale_number generate
 * 4. Sale items yaratma (unit_cost_snapshot ilə)
 * 5. Stock movements (out) yaratma + product stock azaltma
 * 6. Finance transaction (income) yaratma
 * 7. Debt yaratma (qismən/ödənilməmiş satışda)
 * 8. Low stock notification yoxlaması
 * 9. Audit log yazma
 * 10. Populated sale detail qaytarma
 */
const { getDb } = require('../database/index');
const AuditService = require('./audit-service');
const NotificationService = require('./notification-service');

class SalesService {
  /**
   * Yeni satış yarat — tam transaction ilə
   */
  static createSale(data) {
    const db = getDb();
    const items = data.items || [];
    if (!items.length) throw new Error('Satış üçün ən az 1 məhsul lazımdır');

    const result = db.transaction(() => {
      // ─── 1. Validate & prepare ───────────────────────────────────────
      const now = new Date();
      const date = data.date || now.toISOString().split('T')[0];
      const time = data.time || now.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
      const userId = data.created_by || data.sold_by || null;

      // ─── 2. Check stock for all items ────────────────────────────────
      for (const item of items) {
        if (!item.product_id) continue;
        const product = db.prepare('SELECT id, name, stock_qty FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw new Error(`Məhsul tapılmadı: ID ${item.product_id}`);
        if (product.stock_qty < item.qty) {
          throw new Error(`"${product.name}" stoku kifayət etmir (mövcud: ${product.stock_qty}, tələb: ${item.qty})`);
        }
      }

      // ─── 3. Calculate totals ─────────────────────────────────────────
      const subtotal = items.reduce((s, i) => s + (i.qty * i.unit_price), 0);
      const discount = Number(data.discount) || 0;
      const total = Math.max(0, subtotal - discount);
      const paidAmount = data.payment_status === 'odenilib' ? total : Math.min(total, Number(data.paid_amount) || 0);
      const remainingAmount = Math.max(0, total - paidAmount);
      const paymentStatus = remainingAmount <= 0 ? 'odenilib' : (paidAmount > 0 ? 'qismen' : 'borc');

      // ─── 4. Generate sale_number ─────────────────────────────────────
      const lastSale = db.prepare('SELECT MAX(id) as maxId FROM sales').get();
      const nextId = (lastSale?.maxId || 0) + 1;
      const saleNumber = `SAT-${String(nextId).padStart(5, '0')}`;

      // ─── 5. Insert sale ──────────────────────────────────────────────
      const saleResult = db.prepare(`
        INSERT INTO sales (sale_number, date, time, customer_id, customer_name, vehicle_id, subtotal, discount, total, 
          payment_status, paid_amount, remaining_amount, payment_method, notes, sold_by, created_by)
        VALUES (@sale_number, @date, @time, @customer_id, @customer_name, @vehicle_id, @subtotal, @discount, @total,
          @payment_status, @paid_amount, @remaining_amount, @payment_method, @notes, @sold_by, @created_by)
      `).run({
        sale_number: saleNumber,
        date, time,
        customer_id: data.customer_id || null,
        customer_name: data.customer_name || null,
        vehicle_id: data.vehicle_id || null,
        subtotal, discount, total,
        payment_status: paymentStatus,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payment_method: data.payment_method || 'cash',
        notes: data.notes || null,
        sold_by: userId,
        created_by: userId,
      });
      const saleId = saleResult.lastInsertRowid;

      // ─── 6. Insert sale items + stock movements ──────────────────────
      const lowStockProducts = [];
      for (const item of items) {
        const product = item.product_id ? db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) : null;
        const unitCost = product ? (product.buy_price || 0) : 0;
        const lineTotal = item.qty * item.unit_price;

        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, unit_cost_snapshot, total, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
        `).run(saleId, item.product_id || null, item.product_name || product?.name || 'Naməlum', item.qty, item.unit_price, unitCost, lineTotal);

        // Stock movement - reduce stock
        if (item.product_id && product) {
          const qtyBefore = product.stock_qty;
          const qtyAfter = qtyBefore - Math.abs(item.qty);
          db.prepare(`UPDATE products SET stock_qty = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(qtyAfter, item.product_id);
          db.prepare(`
            INSERT INTO stock_movements (product_id, movement_type, qty, qty_before, qty_after, ref_type, ref_id, note, created_by)
            VALUES (?, 'satis', ?, ?, ?, 'sale', ?, ?, ?)
          `).run(item.product_id, -Math.abs(item.qty), qtyBefore, qtyAfter, saleId, `Satış ${saleNumber}`, userId);

          // Check low stock
          if (qtyAfter <= (product.min_stock || 0) && (product.min_stock || 0) > 0) {
            lowStockProducts.push({ id: product.id, name: product.name, qty: qtyAfter, min: product.min_stock });
          }
        }
      }

      // ─── 7. Finance transaction (income) ─────────────────────────────
      if (paidAmount > 0) {
        db.prepare(`
          INSERT INTO finance_transactions (date, type, category, amount, description, ref_type, ref_id, payment_method, created_by)
          VALUES (?, 'income', 'Satış', ?, ?, 'sale', ?, ?, ?)
        `).run(date, paidAmount, `Satış ${saleNumber} - ${data.customer_name || 'Qonaq'}`, saleId, data.payment_method || 'cash', userId);
      }

      // ─── 8. Debt (if unpaid/partial) ─────────────────────────────────
      let debtId = null;
      if (remainingAmount > 0) {
        const debtResult = db.prepare(`
          INSERT INTO debts (customer_id, sale_id, total_amount, paid_amount, remaining_amount, status, note, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          data.customer_id || null, saleId, total, paidAmount, remainingAmount,
          paidAmount > 0 ? 'partial' : 'open',
          `Satış ${saleNumber} borcu`, userId
        );
        debtId = debtResult.lastInsertRowid;
      }

      // ─── 9. Notifications ────────────────────────────────────────────
      // Low stock notifications
      for (const p of lowStockProducts) {
        NotificationService.notifyLowStock(p.id, p.name, p.qty, p.min, userId);
      }
      // Debt notification
      if (debtId && data.customer_name) {
        NotificationService.notifyDebtCreated(debtId, data.customer_name, remainingAmount, userId);
      }

      // ─── 10. Audit log ──────────────────────────────────────────────
      AuditService.logCreate('sales', 'sale', saleId, userId, null, {
        sale_number: saleNumber, total, paid_amount: paidAmount, items: items.length,
        customer: data.customer_name, payment_status: paymentStatus
      }, `Yeni satış: ${saleNumber}, ${total.toFixed(2)} ₼`);

      return { saleId, saleNumber, debtId };
    })();

    return this.getSaleDetail(result.saleId);
  }

  /**
   * Satış detail — tam populated
   */
  static getSaleDetail(id) {
    const db = getDb();
    const sale = db.prepare(`
      SELECT s.*, 
        c.name as customer_name_full, c.phone as customer_phone, c.email as customer_email,
        v.brand as vehicle_brand, v.model as vehicle_model, v.plate as vehicle_plate,
        u.full_name as sold_by_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      LEFT JOIN users u ON s.sold_by = u.id
      WHERE s.id = ?
    `).get(id);
    if (!sale) return null;

    // Items
    sale.items = db.prepare(`
      SELECT si.*, p.unit, p.stock_qty, p.buy_price as current_buy_price
      FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(id);

    // Debt info
    sale.debt = db.prepare(`SELECT * FROM debts WHERE sale_id = ? ORDER BY id DESC LIMIT 1`).get(id);

    // Debt payments (if debt exists)
    if (sale.debt) {
      sale.debt.payments = db.prepare(`
        SELECT dp.*, u.full_name as received_by_name
        FROM debt_payments dp LEFT JOIN users u ON dp.received_by = u.id
        WHERE dp.debt_type = 'sale' AND dp.debt_id = ?
        ORDER BY dp.created_at DESC
      `).all(id);
    }

    // Finance transactions
    sale.finance_transactions = db.prepare(`
      SELECT * FROM finance_transactions WHERE ref_type = 'sale' AND ref_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Audit logs
    sale.audit_logs = db.prepare(`
      SELECT * FROM audit_logs WHERE entity_type = 'sale' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(id);

    // Notes
    sale.notes_list = db.prepare(`SELECT * FROM notes WHERE sale_id = ? ORDER BY created_at DESC`).all(id);

    return sale;
  }

  /**
   * Satış sil — stok iadəsi, maliyyə silinməsi, borc silinməsi
   */
  static deleteSale(id, userId = null) {
    const db = getDb();
    const sale = this.getSaleDetail(id);
    if (!sale) throw new Error('Satış tapılmadı');

    db.transaction(() => {
      // 1. Restore stock for each item
      for (const item of (sale.items || [])) {
        if (item.product_id) {
          const product = db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(item.product_id);
          if (product) {
            const newQty = product.stock_qty + Math.abs(item.qty);
            db.prepare('UPDATE products SET stock_qty = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(newQty, item.product_id);
            db.prepare(`
              INSERT INTO stock_movements (product_id, movement_type, qty, qty_before, qty_after, ref_type, ref_id, note, created_by)
              VALUES (?, 'iade', ?, ?, ?, 'sale_delete', ?, ?, ?)
            `).run(item.product_id, Math.abs(item.qty), product.stock_qty, newQty, id, `Satış #${id} silindi`, userId);
          }
        }
      }

      // 2. Delete related finance transactions
      db.prepare("DELETE FROM finance_transactions WHERE ref_type = 'sale' AND ref_id = ?").run(id);

      // 3. Delete related debts
      db.prepare('DELETE FROM debts WHERE sale_id = ?').run(id);

      // 4. Delete sale items
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);

      // 5. Delete sale
      db.prepare('DELETE FROM sales WHERE id = ?').run(id);

      // 6. Audit
      AuditService.logDelete('sales', 'sale', id, userId, null, {
        sale_number: sale.sale_number, total: sale.total, customer: sale.customer_name
      }, `Satış silindi: ${sale.sale_number}`);
    })();

    return { success: true };
  }
}

module.exports = SalesService;
