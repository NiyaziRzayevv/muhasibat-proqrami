const { getDb } = require('./index');

function getAllVehicles(search = '', userId = null) {
  const db = getDb();
  let query = `
    SELECT v.*, c.name as customer_name, c.phone as customer_phone,
      (SELECT COUNT(*) FROM records r WHERE r.vehicle_id = v.id) as service_count,
      (SELECT COALESCE(SUM(r.total_price), 0) FROM records r WHERE r.vehicle_id = v.id) as total_spent,
      (SELECT MAX(r.date) FROM records r WHERE r.vehicle_id = v.id) as last_service
    FROM vehicles v
    LEFT JOIN customers c ON v.customer_id = c.id
  `;
  const params = [];
  const conds = [];
  if (search) {
    conds.push(`(LOWER(v.brand) LIKE ? OR LOWER(v.model) LIKE ? OR LOWER(v.plate) LIKE ? OR LOWER(c.name) LIKE ?)`);
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s, s);
  }
  if (userId) {
    conds.push(`v.created_by = ?`);
    params.push(userId);
  }
  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ` ORDER BY v.brand ASC, v.model ASC`;
  return db.prepare(query).all(...params);
}

function getVehicleById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT v.*, c.name as customer_name, c.phone as customer_phone
    FROM vehicles v LEFT JOIN customers c ON v.customer_id = c.id
    WHERE v.id = ?
  `).get(id);
}

function findVehicleByPlate(plate, userId = null) {
  if (!plate) return null;
  const db = getDb();
  if (userId) {
    return db.prepare(`SELECT * FROM vehicles WHERE LOWER(REPLACE(plate, ' ', '')) = LOWER(REPLACE(?, ' ', '')) AND created_by = ?`).get(plate, userId);
  }
  return db.prepare(`SELECT * FROM vehicles WHERE LOWER(REPLACE(plate, ' ', '')) = LOWER(REPLACE(?, ' ', ''))`).get(plate);
}

function createVehicle(data) {
  const db = getDb();
  if (data.plate) {
    const existing = findVehicleByPlate(data.plate, data.created_by || null);
    if (existing) return existing;
  }
  const result = db.prepare(`
    INSERT INTO vehicles (customer_id, brand, model, plate, year, notes, created_by)
    VALUES (@customer_id, @brand, @model, @plate, @year, @notes, @created_by)
  `).run({
    customer_id: data.customer_id || null,
    brand: data.brand || null,
    model: data.model || null,
    plate: data.plate || null,
    year: data.year || null,
    notes: data.notes || null,
    created_by: data.created_by || null,
  });
  return getVehicleById(result.lastInsertRowid);
}

function updateVehicle(id, data) {
  const db = getDb();
  const existing = getVehicleById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  db.prepare(`
    UPDATE vehicles SET
      customer_id = @customer_id, brand = @brand, model = @model,
      plate = @plate, year = @year, notes = @notes
    WHERE id = @id
  `).run({ ...merged, id });
  return getVehicleById(id);
}

function deleteVehicle(id) {
  const db = getDb();
  db.prepare(`UPDATE records SET vehicle_id = NULL WHERE vehicle_id = ?`).run(id);
  const result = db.prepare(`DELETE FROM vehicles WHERE id = ?`).run(id);
  return result.changes > 0;
}

function getVehiclesByCustomer(customerId) {
  const db = getDb();
  return db.prepare(`SELECT * FROM vehicles WHERE customer_id = ? ORDER BY brand ASC`).all(customerId);
}

module.exports = {
  getAllVehicles, getVehicleById, findVehicleByPlate,
  createVehicle, updateVehicle, deleteVehicle, getVehiclesByCustomer,
};
