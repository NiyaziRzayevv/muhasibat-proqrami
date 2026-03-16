const { getDb } = require('./index');

function logAction(data) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, user_name, old_data, new_data)
      VALUES (@action, @entity_type, @entity_id, @user_id, @user_name, @old_data, @new_data)
    `).run({
      action: data.action,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      user_id: data.user_id || null,
      user_name: data.user_name || 'Sistem',
      old_data: data.old_data ? JSON.stringify(data.old_data) : null,
      new_data: data.new_data ? JSON.stringify(data.new_data) : null,
    });
  } catch (e) {
    // audit log failure should not break main flow
    console.error('Audit log error:', e.message);
  }
}

function getAllLogs(filters = {}) {
  const db = getDb();
  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params = [];

  if (filters.action) { query += ` AND action LIKE ?`; params.push(`%${filters.action}%`); }
  if (filters.entity_type) { query += ` AND entity_type = ?`; params.push(filters.entity_type); }
  if (filters.user_id) { query += ` AND user_id = ?`; params.push(filters.user_id); }
  if (filters.startDate) { query += ` AND created_at >= ?`; params.push(filters.startDate); }
  if (filters.endDate) { query += ` AND created_at <= ?`; params.push(filters.endDate + ' 23:59:59'); }
  if (filters.search) {
    query += ` AND (LOWER(action) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(entity_type) LIKE ?)`;
    const s = `%${filters.search.toLowerCase()}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY created_at DESC`;
  if (filters.limit) { query += ` LIMIT ? OFFSET ?`; params.push(filters.limit, filters.offset || 0); }
  else { query += ` LIMIT 500`; }

  return db.prepare(query).all(...params);
}

function getLogCount(filters = {}) {
  const db = getDb();
  let query = `SELECT COUNT(*) as count FROM audit_logs WHERE 1=1`;
  const params = [];
  if (filters.entity_type) { query += ` AND entity_type = ?`; params.push(filters.entity_type); }
  if (filters.user_id) { query += ` AND user_id = ?`; params.push(filters.user_id); }
  return db.prepare(query).get(...params).count;
}

function clearOldLogs(daysOld = 90) {
  const db = getDb();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
  return db.prepare(`DELETE FROM audit_logs WHERE created_at < ?`).run(cutoff).changes;
}

module.exports = { logAction, getAllLogs, getLogCount, clearOldLogs };
