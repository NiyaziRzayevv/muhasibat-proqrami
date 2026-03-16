const { getDb } = require('./index');

function getAllSuppliers(search = '', userId = null) {
  const db = getDb();
  let q = `
    SELECT s.*, COUNT(p.id) as product_count
    FROM suppliers s
    LEFT JOIN products p ON p.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];
  if (userId) { q += ` AND s.created_by = ?`; params.push(userId); }
  if (search) {
    q += ` AND (s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  q += ` GROUP BY s.id ORDER BY s.name ASC`;
  return db.prepare(q).all(...params);
}

function getSupplierById(id) {
  return getDb().prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id);
}

function createSupplier(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO suppliers (name, phone, email, address, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, data.created_by || null);
  return getSupplierById(result.lastInsertRowid);
}

function updateSupplier(id, data) {
  const db = getDb();
  db.prepare(`
    UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?
  `).run(data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, id);
  return getSupplierById(id);
}

function deleteSupplier(id, userId = null) {
  if (userId) return getDb().prepare(`DELETE FROM suppliers WHERE id = ? AND created_by = ?`).run(id, userId);
  return getDb().prepare(`DELETE FROM suppliers WHERE id = ?`).run(id);
}

function getSupplierProducts(id) {
  return getDb().prepare(`SELECT * FROM products WHERE supplier_id = ? ORDER BY name`).all(id);
}

module.exports = { getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier, getSupplierProducts };
