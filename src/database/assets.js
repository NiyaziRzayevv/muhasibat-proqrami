const { getDb } = require('./index');

function getAllAssets(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM assets WHERE deleted_at IS NULL';
  const params = [];

  if (filters.userId) { sql += ' AND created_by = ?'; params.push(filters.userId); }
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
  if (filters.search) {
    sql += ' AND (name LIKE ? OR serial_number LIKE ? OR location LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params);
}

function getAssetById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM assets WHERE id = ? AND deleted_at IS NULL').get(id);
}

function createAsset(data) {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO assets (name, category, serial_number, purchase_date, purchase_price, current_value, location, status, condition, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    data.name, data.category || 'Avadanlıq', data.serial_number || null,
    data.purchase_date || null, data.purchase_price ?? null, data.current_value ?? null,
    data.location || null, data.status || 'active', data.condition || 'yaxşı',
    data.notes || null, data.created_by || null
  );
  return getAssetById(info.lastInsertRowid);
}

function updateAsset(id, data) {
  const db = getDb();
  const fields = [];
  const params = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
  if (data.serial_number !== undefined) { fields.push('serial_number = ?'); params.push(data.serial_number); }
  if (data.purchase_date !== undefined) { fields.push('purchase_date = ?'); params.push(data.purchase_date); }
  if (data.purchase_price !== undefined) { fields.push('purchase_price = ?'); params.push(data.purchase_price); }
  if (data.current_value !== undefined) { fields.push('current_value = ?'); params.push(data.current_value); }
  if (data.location !== undefined) { fields.push('location = ?'); params.push(data.location); }
  if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
  if (data.condition !== undefined) { fields.push('condition = ?'); params.push(data.condition); }
  if (data.notes !== undefined) { fields.push('notes = ?'); params.push(data.notes); }

  if (!fields.length) return getAssetById(id);
  fields.push("updated_at = datetime('now','localtime')");
  params.push(id);

  db.prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getAssetById(id);
}

function deleteAsset(id) {
  const db = getDb();
  db.prepare("UPDATE assets SET deleted_at = datetime('now','localtime') WHERE id = ?").run(id);
  return { deleted: true };
}

function getAssetCategories() {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT category FROM assets WHERE deleted_at IS NULL AND category IS NOT NULL ORDER BY category').all();
  return rows.map(r => r.category);
}

module.exports = { getAllAssets, getAssetById, createAsset, updateAsset, deleteAsset, getAssetCategories };
