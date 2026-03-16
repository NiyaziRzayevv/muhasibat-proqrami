const { getDb } = require('./index');
const { addMovement } = require('./stock_movements');

function getAllSales(filters = {}) {
  const db = getDb();
  let q = `
    SELECT s.*, c.phone as customer_phone,
      (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE 1=1
  `;
  const params = [];
  const sd = filters.startDate || filters.dateFrom;
  const ed = filters.endDate   || filters.dateTo;
  if (sd) { q += ` AND s.date >= ?`; params.push(sd); }
  if (ed) { q += ` AND s.date <= ?`; params.push(ed); }
  if (filters.payment_status) { q += ` AND s.payment_status = ?`; params.push(filters.payment_status); }
  if (filters.payment_method) { q += ` AND s.payment_method = ?`; params.push(filters.payment_method); }
  if (filters.customer_id) { q += ` AND s.customer_id = ?`; params.push(filters.customer_id); }
  if (filters.search) { q += ` AND (s.customer_name LIKE ?)`; params.push(`%${filters.search}%`); }
  if (filters.userId) { q += ` AND s.created_by = ?`; params.push(filters.userId); }
  q += ` ORDER BY s.date DESC, s.time DESC`;
  if (filters.limit) { q += ` LIMIT ? OFFSET ?`; params.push(filters.limit, filters.offset || 0); }
  return db.prepare(q).all(...params);
}

function getSaleById(id) {
  const db = getDb();
  const sale = db.prepare(`SELECT s.*, c.phone as customer_phone FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`).get(id);
  if (!sale) return null;
  sale.items = db.prepare(`
    SELECT si.*, p.unit, p.stock_qty FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(id);
  return sale;
}

function createSale(data) {
  const db = getDb();
  const items = data.items || [];
  const createdBy = data.created_by || null;

  const saleId = db.transaction(() => {
    const subtotal = items.reduce((s, i) => s + (i.qty * i.unit_price), 0);
    const discount = data.discount || 0;
    const total = subtotal - discount;
    const paidAmount = data.payment_status === 'odenilib' ? total : (data.paid_amount || 0);

    const result = db.prepare(`
      INSERT INTO sales (date, time, customer_id, customer_name, subtotal, discount, total, payment_status, paid_amount, payment_method, notes, created_by)
      VALUES (@date, @time, @customer_id, @customer_name, @subtotal, @discount, @total, @payment_status, @paid_amount, @payment_method, @notes, @created_by)
    `).run({
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || null,
      subtotal,
      discount,
      total,
      payment_status: data.payment_status || 'odenilib',
      paid_amount: paidAmount,
      payment_method: data.payment_method || 'cash',
      notes: data.notes || null,
      created_by: data.created_by || null,
    });

    const saleId = result.lastInsertRowid;

    for (const item of items) {
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id || null, item.product_name, item.qty, item.unit_price, item.qty * item.unit_price);

      if (item.product_id) {
        addMovement(db, item.product_id, 'satis', -Math.abs(item.qty), 'sale', saleId, `Satış #${saleId}`, createdBy);
      }
    }
    return saleId;
  })();

  return getSaleById(saleId);
}

function updateSalePayment(id, paidAmount, status) {
  const db = getDb();
  db.prepare(`UPDATE sales SET paid_amount=?, payment_status=? WHERE id=?`).run(paidAmount, status, id);
  return getSaleById(id);
}

function deleteSale(id, userId = null) {
  const db = getDb();
  return db.transaction(() => {
    if (userId) {
      const sale = db.prepare(`SELECT id FROM sales WHERE id = ? AND created_by = ?`).get(id, userId);
      if (!sale) return { changes: 0 };
    }
    const items = db.prepare(`SELECT * FROM sale_items WHERE sale_id = ?`).all(id);
    for (const item of items) {
      if (item.product_id) {
        try {
          addMovement(db, item.product_id, 'iade', Math.abs(item.qty), 'sale_delete', id, `Satış #${id} silindi`, userId || null);
        } catch (e) {
          console.warn('Stock restore warning:', item.product_id, e.message);
        }
      }
    }
    db.prepare(`DELETE FROM sale_items WHERE sale_id = ?`).run(id);
    return db.prepare(`DELETE FROM sales WHERE id = ?`).run(id);
  })();
}

function getSalesStats(startDate, endDate, userId = null) {
  const db = getDb();
  let where = `WHERE 1=1`;
  const params = [];
  if (userId) { where += ` AND created_by = ?`; params.push(userId); }
  if (startDate) { where += ` AND date >= ?`; params.push(startDate); }
  if (endDate) { where += ` AND date <= ?`; params.push(endDate); }

  const totals = db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue, COALESCE(SUM(paid_amount),0) as paid FROM sales ${where}`).get(...params);
  const byMethod = db.prepare(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as total
    FROM sales ${where}
    GROUP BY payment_method ORDER BY total DESC
  `).all(...params);
  const byStatus = db.prepare(`
    SELECT payment_status, COUNT(*) as count, COALESCE(SUM(total),0) as total
    FROM sales ${where}
    GROUP BY payment_status
  `).all(...params);

  return { ...totals, byMethod, byStatus };
}

function getPaymentMethodStats(startDate, endDate, userId = null) {
  const db = getDb();
  let where = `WHERE 1=1`;
  const params = [];
  if (userId) { where += ` AND created_by = ?`; params.push(userId); }
  if (startDate) { where += ` AND date >= ?`; params.push(startDate); }
  if (endDate) { where += ` AND date <= ?`; params.push(endDate); }

  return db.prepare(`
    SELECT
      payment_method,
      COUNT(*) as count,
      COALESCE(SUM(total),0) as total,
      COALESCE(SUM(paid_amount),0) as paid,
      COALESCE(SUM(total - paid_amount),0) as unpaid
    FROM sales ${where}
    GROUP BY payment_method
    ORDER BY total DESC
  `).all(...params);
}

function getTopSellingProducts(limit = 10, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND s.created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT si.product_id, si.product_name, SUM(si.qty) as total_qty, SUM(si.total) as total_revenue,
           p.unit, p.stock_qty
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    LEFT JOIN sales s ON si.sale_id = s.id
    WHERE 1=1${uf}
    GROUP BY si.product_id, si.product_name
    ORDER BY total_qty DESC
    LIMIT ?
  `).all(limit);
}

function getMonthlySalesChart(year, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT strftime('%m', date) as month,
           COUNT(*) as count,
           COALESCE(SUM(total),0) as total
    FROM sales
    WHERE strftime('%Y', date) = ?${uf}
    GROUP BY month ORDER BY month
  `).all(String(year));
}

module.exports = {
  getAllSales, getSaleById, createSale, updateSalePayment,
  deleteSale, getSalesStats, getPaymentMethodStats,
  getTopSellingProducts, getMonthlySalesChart,
};
