const { getDb } = require('./index');
const { updateProductStock, getProductById } = require('./products');

function addMovement(db, productId, type, qty, refType, refId, note, createdBy) {
  const product = db.prepare(`SELECT stock_qty FROM products WHERE id = ?`).get(productId);
  if (!product) throw new Error('Məhsul tapılmadı: ' + productId);
  const before = product.stock_qty;
  const after = before + qty;
  if (after < 0) throw new Error('Stok kifayət etmir');
  db.prepare(`UPDATE products SET stock_qty = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(after, productId);
  db.prepare(`
    INSERT INTO stock_movements (product_id, movement_type, qty, qty_before, qty_after, ref_type, ref_id, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(productId, type, qty, before, after, refType || null, refId || null, note || null, createdBy || null);
  return after;
}

function stockIn(productId, qty, note, refType, refId, createdBy) {
  const db = getDb();
  return addMovement(db, productId, 'giris', Math.abs(qty), refType, refId, note, createdBy);
}

function stockOut(productId, qty, note, refType, refId, createdBy) {
  const db = getDb();
  return addMovement(db, productId, 'cixis', -Math.abs(qty), refType, refId, note, createdBy);
}

function stockAdjust(productId, newQty, note, createdBy) {
  const db = getDb();
  const product = db.prepare(`SELECT stock_qty FROM products WHERE id = ?`).get(productId);
  if (!product) throw new Error('Məhsul tapılmadı');
  const diff = newQty - product.stock_qty;
  if (diff === 0) return product.stock_qty;
  return addMovement(db, productId, 'duzeltme', diff, null, null, note || 'Manual düzəliş', createdBy);
}

function getAllMovements(filters = {}) {
  const db = getDb();
  let q = `
    SELECT sm.*, p.name as product_name, p.unit
    FROM stock_movements sm
    LEFT JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.userId) { q += ` AND sm.created_by = ?`; params.push(filters.userId); }
  if (filters.product_id) { q += ` AND sm.product_id = ?`; params.push(filters.product_id); }
  if (filters.movement_type) { q += ` AND sm.movement_type = ?`; params.push(filters.movement_type); }
  if (filters.startDate) { q += ` AND DATE(sm.created_at) >= ?`; params.push(filters.startDate); }
  if (filters.endDate) { q += ` AND DATE(sm.created_at) <= ?`; params.push(filters.endDate); }
  q += ` ORDER BY sm.created_at DESC`;
  if (filters.limit) { q += ` LIMIT ?`; params.push(filters.limit); }
  return db.prepare(q).all(...params);
}

function getMovementStats(userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  return {
    totalIn: db.prepare(`SELECT COALESCE(SUM(qty),0) as v FROM stock_movements WHERE movement_type='giris'${uf}`).get().v,
    totalOut: db.prepare(`SELECT COALESCE(SUM(ABS(qty)),0) as v FROM stock_movements WHERE movement_type IN ('cixis','satis','servis')${uf}`).get().v,
    todayIn: db.prepare(`SELECT COALESCE(SUM(qty),0) as v FROM stock_movements WHERE movement_type='giris' AND DATE(created_at)=DATE('now','localtime')${uf}`).get().v,
    todayOut: db.prepare(`SELECT COALESCE(SUM(ABS(qty)),0) as v FROM stock_movements WHERE movement_type IN ('cixis','satis','servis') AND DATE(created_at)=DATE('now','localtime')${uf}`).get().v,
  };
}

module.exports = { stockIn, stockOut, stockAdjust, getAllMovements, getMovementStats, addMovement };
