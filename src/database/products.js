const { getDb } = require('./index');

function getAllProducts(filters = {}) {
  const db = getDb();
  let q = `
    SELECT p.*, c.name AS category_name, c.color AS category_color, s.name AS supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.userId) { q += ` AND p.created_by = ?`; params.push(filters.userId); }
  if (filters.search) {
    q += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.category_id) { q += ` AND p.category_id = ?`; params.push(filters.category_id); }
  if (filters.supplier_id) { q += ` AND p.supplier_id = ?`; params.push(filters.supplier_id); }
  if (filters.low_stock === true || filters.low_stock === 'true') {
    q += ` AND p.stock_qty <= p.min_stock`;
  }
  q += ` ORDER BY p.name ASC`;
  return db.prepare(q).all(...params);
}

function getProductById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, c.name AS category_name, c.color AS category_color, s.name AS supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `).get(id);
}

function getProductByName(name) {
  const db = getDb();
  return db.prepare(`SELECT * FROM products WHERE LOWER(name) LIKE LOWER(?) LIMIT 1`).get(`%${name}%`);
}

function findProductByName(name, userId = null) {
  const db = getDb();
  let q = `SELECT * FROM products WHERE LOWER(name) = LOWER(?)`;
  const params = [name];
  if (userId) { q += ` AND created_by = ?`; params.push(userId); }
  return db.prepare(q).get(...params);
}

function createProduct(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO products (name, category_id, sku, barcode, buy_price, sell_price, stock_qty, min_stock, unit, supplier_id, notes, created_by)
    VALUES (@name, @category_id, @sku, @barcode, @buy_price, @sell_price, @stock_qty, @min_stock, @unit, @supplier_id, @notes, @created_by)
  `);
  const result = stmt.run({
    name: data.name,
    category_id: data.category_id || null,
    sku: data.sku || null,
    barcode: data.barcode || null,
    buy_price: data.buy_price || 0,
    sell_price: data.sell_price || 0,
    stock_qty: data.stock_qty || 0,
    min_stock: data.min_stock || 5,
    unit: data.unit || 'ədəd',
    supplier_id: data.supplier_id || null,
    notes: data.notes || null,
    created_by: data.created_by || null,
  });
  return getProductById(result.lastInsertRowid);
}

function updateProduct(id, data) {
  const db = getDb();
  const fields = ['name','category_id','sku','barcode','buy_price','sell_price','stock_qty','min_stock','unit','supplier_id','notes'];
  const setClauses = fields.filter(f => data[f] !== undefined).map(f => `${f} = @${f}`);
  if (setClauses.length === 0) return getProductById(id);
  setClauses.push(`updated_at = datetime('now','localtime')`);
  db.prepare(`UPDATE products SET ${setClauses.join(', ')} WHERE id = @id`).run({ ...data, id });
  return getProductById(id);
}

function updateProductStock(id, newQty) {
  const db = getDb();
  db.prepare(`UPDATE products SET stock_qty = ?, updated_at = datetime('now','localtime') WHERE id = ?`).run(newQty, id);
}

function deleteProduct(id, userId = null) {
  const db = getDb();
  if (userId) return db.prepare(`DELETE FROM products WHERE id = ? AND created_by = ?`).run(id, userId);
  return db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
}

function getLowStockProducts(userId = null) {
  const db = getDb();
  let q = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.stock_qty <= p.min_stock
  `;
  const params = [];
  if (userId) { q += ` AND p.created_by = ?`; params.push(userId); }
  q += ` ORDER BY p.stock_qty ASC`;
  return db.prepare(q).all(...params);
}

function getStockValue(userId = null) {
  const db = getDb();
  let q = `
    SELECT
      COUNT(*) as total_products,
      SUM(stock_qty) as total_units,
      SUM(stock_qty * buy_price) as buy_value,
      SUM(stock_qty * sell_price) as sell_value
    FROM products
  `;
  const params = [];
  if (userId) { q += ` WHERE created_by = ?`; params.push(userId); }
  return db.prepare(q).get(...params);
}

module.exports = {
  getAllProducts, getProductById, getProductByName, findProductByName,
  createProduct, updateProduct, updateProductStock,
  deleteProduct, getLowStockProducts, getStockValue,
};
