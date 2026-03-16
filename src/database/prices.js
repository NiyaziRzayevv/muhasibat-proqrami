const { getDb } = require('./index');

function getAllPrices(search = '', userId = null) {
  const db = getDb();
  let query = `SELECT * FROM price_base WHERE 1=1`;
  const params = [];
  if (userId) { query += ` AND created_by = ?`; params.push(userId); }
  if (search) {
    query += ` AND (LOWER(service_type) LIKE ? OR LOWER(brand) LIKE ?)`;
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s);
  }
  query += ` ORDER BY brand ASC, service_type ASC`;
  return db.prepare(query).all(...params);
}

function getPriceById(id) {
  const db = getDb();
  return db.prepare(`SELECT * FROM price_base WHERE id = ?`).get(id);
}

function lookupPrice(brand, serviceType, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  if (brand && serviceType) {
    const exact = db.prepare(`
      SELECT * FROM price_base
      WHERE LOWER(brand) = LOWER(?) AND LOWER(service_type) LIKE LOWER(?)${uf}
      LIMIT 1
    `).get(brand, `%${serviceType}%`);
    if (exact) return exact;
  }
  if (serviceType) {
    const byService = db.prepare(`
      SELECT * FROM price_base
      WHERE LOWER(service_type) LIKE LOWER(?) AND (brand IS NULL OR brand = '')${uf}
      LIMIT 1
    `).get(`%${serviceType}%`);
    if (byService) return byService;
    const anyBrand = db.prepare(`
      SELECT * FROM price_base
      WHERE LOWER(service_type) LIKE LOWER(?)${uf}
      LIMIT 1
    `).get(`%${serviceType}%`);
    if (anyBrand) return anyBrand;
  }
  return null;
}

function createPrice(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO price_base (brand, service_type, price, notes, created_by)
    VALUES (@brand, @service_type, @price, @notes, @created_by)
  `).run({
    brand: data.brand || null,
    service_type: data.service_type,
    price: data.price || null,
    notes: data.notes || null,
    created_by: data.created_by || null,
  });
  return getPriceById(result.lastInsertRowid);
}

function updatePrice(id, data) {
  const db = getDb();
  db.prepare(`
    UPDATE price_base SET
      brand = @brand, service_type = @service_type,
      price = @price, notes = @notes,
      updated_at = datetime('now','localtime')
    WHERE id = @id
  `).run({ ...data, id });
  return getPriceById(id);
}

function deletePrice(id, userId = null) {
  const db = getDb();
  if (userId) return db.prepare(`DELETE FROM price_base WHERE id = ? AND created_by = ?`).run(id, userId).changes > 0;
  return db.prepare(`DELETE FROM price_base WHERE id = ?`).run(id).changes > 0;
}

module.exports = { getAllPrices, getPriceById, lookupPrice, createPrice, updatePrice, deletePrice };
