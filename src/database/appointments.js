const { getDb } = require('./index');

function getAllAppointments(filters = {}) {
  const db = getDb();
  let query = `SELECT a.*, c.name as linked_customer_name, c.phone as linked_customer_phone
    FROM appointments a
    LEFT JOIN customers c ON a.customer_id = c.id`;
  const params = [];
  const conds = [];

  if (filters.search) {
    conds.push(`(LOWER(a.title) LIKE ? OR LOWER(a.customer_name) LIKE ? OR a.phone LIKE ?)`);
    const s = `%${filters.search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  if (filters.status) {
    conds.push(`a.status = ?`);
    params.push(filters.status);
  }
  if (filters.date) {
    conds.push(`a.date = ?`);
    params.push(filters.date);
  }
  if (filters.startDate && filters.endDate) {
    conds.push(`a.date >= ? AND a.date <= ?`);
    params.push(filters.startDate, filters.endDate);
  }
  if (filters.customerId) {
    conds.push(`a.customer_id = ?`);
    params.push(filters.customerId);
  }
  if (filters.createdBy) {
    conds.push(`a.created_by = ?`);
    params.push(filters.createdBy);
  }

  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ` ORDER BY a.date ASC, a.time ASC`;

  return db.prepare(query).all(...params);
}

function getAppointmentById(id) {
  const db = getDb();
  return db.prepare(`SELECT a.*, c.name as linked_customer_name, c.phone as linked_customer_phone
    FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id
    WHERE a.id = ?`).get(id);
}

function createAppointment(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO appointments (title, customer_id, customer_name, phone, date, time, duration, status, notes, created_by)
    VALUES (@title, @customer_id, @customer_name, @phone, @date, @time, @duration, @status, @notes, @created_by)
  `).run({
    title: data.title,
    customer_id: data.customer_id || null,
    customer_name: data.customer_name || null,
    phone: data.phone || null,
    date: data.date,
    time: data.time || '09:00',
    duration: data.duration || 60,
    status: data.status || 'pending',
    notes: data.notes || null,
    created_by: data.created_by || null,
  });
  return getAppointmentById(result.lastInsertRowid);
}

function updateAppointment(id, data) {
  const db = getDb();
  const fields = [];
  const params = {};
  params.id = id;

  if (data.title !== undefined)         { fields.push('title = @title'); params.title = data.title; }
  if (data.customer_id !== undefined)   { fields.push('customer_id = @customer_id'); params.customer_id = data.customer_id || null; }
  if (data.customer_name !== undefined) { fields.push('customer_name = @customer_name'); params.customer_name = data.customer_name; }
  if (data.phone !== undefined)         { fields.push('phone = @phone'); params.phone = data.phone; }
  if (data.date !== undefined)          { fields.push('date = @date'); params.date = data.date; }
  if (data.time !== undefined)          { fields.push('time = @time'); params.time = data.time; }
  if (data.duration !== undefined)      { fields.push('duration = @duration'); params.duration = data.duration; }
  if (data.status !== undefined)        { fields.push('status = @status'); params.status = data.status; }
  if (data.notes !== undefined)         { fields.push('notes = @notes'); params.notes = data.notes; }

  if (!fields.length) return getAppointmentById(id);

  fields.push(`updated_at = datetime('now','localtime')`);
  db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getAppointmentById(id);
}

function deleteAppointment(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM appointments WHERE id = ?`).run(id);
  return result.changes > 0;
}

function getUpcomingAppointments(days = 3, userId = null) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  let query = `SELECT a.*, c.name as linked_customer_name
    FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id
    WHERE a.date >= ? AND a.date <= ? AND a.status IN ('pending','confirmed')`;
  const params = [today, future];
  if (userId) { query += ` AND a.created_by = ?`; params.push(userId); }
  query += ` ORDER BY a.date ASC, a.time ASC LIMIT 20`;
  return db.prepare(query).all(...params);
}

function getTodayAppointments(userId = null) {
  const today = new Date().toISOString().split('T')[0];
  return getAllAppointments({ date: today, createdBy: userId || undefined });
}

function getCustomerAppointments(customerId) {
  const db = getDb();
  return db.prepare(`SELECT * FROM appointments WHERE customer_id = ? ORDER BY date DESC, time DESC`).all(customerId);
}

module.exports = {
  getAllAppointments, getAppointmentById, createAppointment,
  updateAppointment, deleteAppointment, getUpcomingAppointments,
  getTodayAppointments, getCustomerAppointments,
};
