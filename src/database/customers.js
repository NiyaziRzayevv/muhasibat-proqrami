const { getDb } = require('./index');

function getAllCustomers(search = '', userId = null) {
  const db = getDb();
  let query = `
    SELECT c.*,
      (SELECT COUNT(*) FROM records r WHERE r.customer_id = c.id) +
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) as visit_count,
      (SELECT COALESCE(SUM(r.total_price), 0) FROM records r WHERE r.customer_id = c.id) +
      (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.customer_id = c.id) as total_spent,
      (SELECT COALESCE(SUM(s.total - s.paid_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.total > s.paid_amount) as debt,
      COALESCE(
        (SELECT MAX(date) FROM (SELECT r.date FROM records r WHERE r.customer_id = c.id UNION SELECT s.date FROM sales s WHERE s.customer_id = c.id)),
        NULL
      ) as last_visit
    FROM customers c
  `;
  const params = [];
  const conds = [];
  if (search) {
    conds.push(`(LOWER(c.name) LIKE ? OR c.phone LIKE ?)`);
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s);
  }
  if (userId) {
    conds.push(`c.created_by = ?`);
    params.push(userId);
  }
  if (conds.length) {
    query += ' WHERE ' + conds.join(' AND ');
  }
  query += ` ORDER BY c.name ASC`;
  return db.prepare(query).all(...params);
}

function getCustomerById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM records r WHERE r.customer_id = c.id) +
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) as visit_count,
      (SELECT COALESCE(SUM(r.total_price), 0) FROM records r WHERE r.customer_id = c.id) +
      (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.customer_id = c.id) as total_spent,
      (SELECT COALESCE(SUM(s.total - s.paid_amount), 0) FROM sales s WHERE s.customer_id = c.id AND s.total > s.paid_amount) as debt,
      COALESCE(
        (SELECT MAX(date) FROM (SELECT r.date FROM records r WHERE r.customer_id = c.id UNION SELECT s.date FROM sales s WHERE s.customer_id = c.id)),
        NULL
      ) as last_visit
    FROM customers c WHERE c.id = ?
  `).get(id);
}

function findCustomerByNameOrPhone(name, phone, userId = null) {
  const db = getDb();
  if (phone) {
    const byPhone = userId
      ? db.prepare(`SELECT * FROM customers WHERE phone = ? AND created_by = ?`).get(phone, userId)
      : db.prepare(`SELECT * FROM customers WHERE phone = ?`).get(phone);
    if (byPhone) return byPhone;
  }
  if (name) {
    const byName = userId
      ? db.prepare(`SELECT * FROM customers WHERE LOWER(name) = LOWER(?) AND created_by = ?`).get(name, userId)
      : db.prepare(`SELECT * FROM customers WHERE LOWER(name) = LOWER(?)`).get(name);
    if (byName) return byName;
  }
  return null;
}

function createCustomer(data) {
  const db = getDb();
  const existing = findCustomerByNameOrPhone(data.name, data.phone, data.created_by || null);
  if (existing) return existing;

  const result = db.prepare(`
    INSERT INTO customers (name, phone, notes, created_by)
    VALUES (@name, @phone, @notes, @created_by)
  `).run({
    name: data.name || null,
    phone: data.phone || null,
    notes: data.notes || null,
    created_by: data.created_by || null,
  });
  return getCustomerById(result.lastInsertRowid);
}

function updateCustomer(id, data) {
  const db = getDb();
  db.prepare(`
    UPDATE customers SET
      name = @name, phone = @phone, notes = @notes,
      updated_at = datetime('now','localtime')
    WHERE id = @id
  `).run({ ...data, id });
  return getCustomerById(id);
}

function deleteCustomer(id) {
  const db = getDb();
  db.prepare(`UPDATE records SET customer_id = NULL WHERE customer_id = ?`).run(id);
  db.prepare(`UPDATE vehicles SET customer_id = NULL WHERE customer_id = ?`).run(id);
  const result = db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
  return result.changes > 0;
}

function getCustomerRecords(customerId) {
  const db = getDb();
  return db.prepare(`SELECT * FROM records WHERE customer_id = ? ORDER BY date DESC`).all(customerId);
}

function getCustomerCount() {
  const db = getDb();
  return db.prepare(`SELECT COUNT(*) as count FROM customers`).get().count;
}

module.exports = {
  getAllCustomers, getCustomerById, findCustomerByNameOrPhone,
  createCustomer, updateCustomer, deleteCustomer,
  getCustomerRecords, getCustomerCount,
};
