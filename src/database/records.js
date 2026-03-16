const { getDb } = require('./index');
const customersDb = require('./customers');
const vehiclesDb = require('./vehicles');

function getAllRecords(filters = {}) {
  const db = getDb();
  let query = `SELECT * FROM records WHERE 1=1`;
  const params = [];

  if (filters.userId) {
    query += ` AND created_by = ?`;
    params.push(filters.userId);
  }

  if (filters.startDate) {
    query += ` AND date >= ?`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ` AND date <= ?`;
    params.push(filters.endDate);
  }
  if (filters.brand) {
    query += ` AND LOWER(car_brand) LIKE ?`;
    params.push(`%${filters.brand.toLowerCase()}%`);
  }
  if (filters.serviceType) {
    query += ` AND LOWER(service_type) LIKE ?`;
    params.push(`%${filters.serviceType.toLowerCase()}%`);
  }
  if (filters.paymentStatus) {
    query += ` AND payment_status = ?`;
    params.push(filters.paymentStatus);
  }
  if (filters.search) {
    const s = `%${filters.search.toLowerCase()}%`;
    query += ` AND (LOWER(customer_name) LIKE ? OR LOWER(car_brand) LIKE ? OR LOWER(car_model) LIKE ? OR LOWER(service_type) LIKE ? OR LOWER(car_plate) LIKE ? OR LOWER(notes) LIKE ?)`;
    params.push(s, s, s, s, s, s);
  }

  const orderCol = filters.orderBy || 'date';
  const orderDir = filters.orderDir === 'asc' ? 'ASC' : 'DESC';
  const allowedCols = ['date', 'created_at', 'car_brand', 'service_type', 'total_price', 'customer_name', 'payment_status'];
  const safeCol = allowedCols.includes(orderCol) ? orderCol : 'date';
  query += ` ORDER BY ${safeCol} ${orderDir}, id DESC`;

  if (filters.limit) {
    query += ` LIMIT ? OFFSET ?`;
    params.push(filters.limit, filters.offset || 0);
  }

  return db.prepare(query).all(...params);
}

function getRecordById(id) {
  const db = getDb();
  return db.prepare(`SELECT * FROM records WHERE id = ?`).get(id);
}

function createRecord(data) {
  const db = getDb();
  let customerId = data.customer_id || null;
  if (!customerId && (data.customer_name || data.customer_phone)) {
    const existing = customersDb.findCustomerByNameOrPhone(data.customer_name, data.customer_phone, data.created_by || null);
    if (existing) customerId = existing.id;
    else {
      const created = customersDb.createCustomer({
        name: data.customer_name || data.customer_phone || 'Müştəri',
        phone: data.customer_phone || null,
        notes: data.notes || null,
        created_by: data.created_by || null,
      });
      customerId = created?.id || null;
    }
  }

  let vehicleId = data.vehicle_id || null;
  const hasVehicleInfo = data.car_brand || data.car_model || data.car_plate;
  if (!vehicleId && hasVehicleInfo) {
    const existingVeh = vehiclesDb.findVehicleByPlate(data.car_plate, data.created_by || null);
    if (existingVeh) vehicleId = existingVeh.id;
    else {
      const createdVeh = vehiclesDb.createVehicle({
        customer_id: customerId,
        brand: data.car_brand || null,
        model: data.car_model || null,
        plate: data.car_plate || null,
        notes: data.notes || null,
        created_by: data.created_by || null,
      });
      vehicleId = createdVeh?.id || null;
    }
  }
  const stmt = db.prepare(`
    INSERT INTO records (
      date, time, customer_id, customer_name, customer_phone,
      vehicle_id, car_brand, car_model, car_plate,
      service_type, extra_services, quantity, unit_price, total_price,
      payment_status, paid_amount, remaining_amount, notes, raw_input, created_by
    ) VALUES (
      @date, @time, @customer_id, @customer_name, @customer_phone,
      @vehicle_id, @car_brand, @car_model, @car_plate,
      @service_type, @extra_services, @quantity, @unit_price, @total_price,
      @payment_status, @paid_amount, @remaining_amount, @notes, @raw_input, @created_by
    )
  `);
  const result = stmt.run({
    date: data.date || new Date().toISOString().split('T')[0],
    time: data.time || new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
    customer_id: customerId,
    customer_name: data.customer_name || null,
    customer_phone: data.customer_phone || null,
    vehicle_id: vehicleId,
    car_brand: data.car_brand || null,
    car_model: data.car_model || null,
    car_plate: data.car_plate || null,
    service_type: data.service_type || null,
    extra_services: data.extra_services || null,
    quantity: data.quantity || 1,
    unit_price: data.unit_price || null,
    total_price: data.total_price || null,
    payment_status: data.payment_status || 'gozleyir',
    paid_amount: data.paid_amount || 0,
    remaining_amount: data.remaining_amount || (data.total_price || 0),
    notes: data.notes || null,
    raw_input: data.raw_input || null,
    created_by: data.created_by || null,
  });
  return getRecordById(result.lastInsertRowid);
}

function updateRecord(id, data) {
  const db = getDb();
  const existing = getRecordById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const stmt = db.prepare(`
    UPDATE records SET
      date = @date, time = @time,
      customer_id = @customer_id, customer_name = @customer_name, customer_phone = @customer_phone,
      vehicle_id = @vehicle_id, car_brand = @car_brand, car_model = @car_model, car_plate = @car_plate,
      service_type = @service_type, extra_services = @extra_services,
      quantity = @quantity, unit_price = @unit_price, total_price = @total_price,
      payment_status = @payment_status, paid_amount = @paid_amount, remaining_amount = @remaining_amount,
      notes = @notes, updated_at = datetime('now','localtime')
    WHERE id = @id
  `);
  stmt.run({ ...merged, id });
  return getRecordById(id);
}

function deleteRecord(id, userId = null) {
  const db = getDb();
  if (userId) return db.prepare(`DELETE FROM records WHERE id = ? AND created_by = ?`).run(id, userId).changes > 0;
  return db.prepare(`DELETE FROM records WHERE id = ?`).run(id).changes > 0;
}

function deleteMultipleRecords(ids) {
  const db = getDb();
  const transaction = db.transaction((idList) => {
    for (const id of idList) {
      db.prepare(`DELETE FROM records WHERE id = ?`).run(id);
    }
  });
  transaction(ids);
  return true;
}

function getTodayStats(userId = null) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const userFilter = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  const row = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN payment_status = 'odenilib' THEN total_price ELSE paid_amount END), 0) as revenue,
      COALESCE(SUM(total_price), 0) as total
    FROM records WHERE date = ?${userFilter}
  `).get(today);
  return row;
}

function getMonthStats(year, month, userId = null) {
  const db = getDb();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const userFilter = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  const row = db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN payment_status = 'odenilib' THEN total_price ELSE paid_amount END), 0) as revenue,
      COALESCE(SUM(total_price), 0) as total
    FROM records WHERE date BETWEEN ? AND ?${userFilter}
  `).get(startDate, endDate);
  return row;
}

function getAllTimeStats(userId = null) {
  const db = getDb();
  const userFilter = userId ? `WHERE created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN payment_status = 'odenilib' THEN total_price ELSE paid_amount END), 0) as revenue,
      COALESCE(SUM(total_price), 0) as total,
      COALESCE(SUM(CASE WHEN payment_status != 'odenilib' THEN (total_price - paid_amount) ELSE 0 END), 0) as debt
    FROM records ${userFilter}
  `).get();
}

function getTopServices(limit = 5, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT service_type, COUNT(*) as count, SUM(total_price) as total
    FROM records
    WHERE service_type IS NOT NULL${uf}
    GROUP BY service_type
    ORDER BY count DESC
    LIMIT ?
  `).all(limit);
}

function getTopBrands(limit = 5, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT car_brand, COUNT(*) as count, SUM(total_price) as total
    FROM records
    WHERE car_brand IS NOT NULL${uf}
    GROUP BY car_brand
    ORDER BY count DESC
    LIMIT ?
  `).all(limit);
}

function getMonthlyChart(year, userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT
      strftime('%m', date) as month,
      COUNT(*) as count,
      COALESCE(SUM(total_price), 0) as total
    FROM records
    WHERE strftime('%Y', date) = ?${uf}
    GROUP BY month
    ORDER BY month
  `).all(String(year));
}

function getUnpaidRecords(userId = null) {
  const db = getDb();
  const uf = userId ? ` AND created_by = ${parseInt(userId)}` : '';
  return db.prepare(`
    SELECT * FROM records
    WHERE payment_status IN ('gozleyir', 'qismen', 'borc')${uf}
    ORDER BY date DESC
  `).all();
}

function getRecordsCount(filters = {}) {
  const db = getDb();
  let query = `SELECT COUNT(*) as count FROM records WHERE 1=1`;
  const params = [];
  if (filters.userId) { query += ` AND created_by = ?`; params.push(filters.userId); }
  if (filters.startDate) { query += ` AND date >= ?`; params.push(filters.startDate); }
  if (filters.endDate) { query += ` AND date <= ?`; params.push(filters.endDate); }
  if (filters.brand) { query += ` AND LOWER(car_brand) LIKE ?`; params.push(`%${filters.brand.toLowerCase()}%`); }
  if (filters.paymentStatus) { query += ` AND payment_status = ?`; params.push(filters.paymentStatus); }
  if (filters.search) {
    const s = `%${filters.search.toLowerCase()}%`;
    query += ` AND (LOWER(customer_name) LIKE ? OR LOWER(car_brand) LIKE ? OR LOWER(service_type) LIKE ?)`;
    params.push(s, s, s);
  }
  return db.prepare(query).get(...params).count;
}

module.exports = {
  getAllRecords, getRecordById, createRecord, updateRecord,
  deleteRecord, deleteMultipleRecords, getTodayStats, getMonthStats,
  getAllTimeStats, getTopServices, getTopBrands, getMonthlyChart,
  getUnpaidRecords, getRecordsCount,
};
