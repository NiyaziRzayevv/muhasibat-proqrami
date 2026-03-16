const { getDb } = require('./index');

function getAllTasks(filters = {}) {
  const db = getDb();
  let query = `SELECT * FROM tasks`;
  const params = [];
  const conds = [];

  if (filters.search) {
    conds.push(`(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)`);
    const s = `%${filters.search.toLowerCase()}%`;
    params.push(s, s);
  }
  if (filters.status) {
    conds.push(`status = ?`);
    params.push(filters.status);
  }
  if (filters.priority) {
    conds.push(`priority = ?`);
    params.push(filters.priority);
  }
  if (filters.createdBy) {
    conds.push(`created_by = ?`);
    params.push(filters.createdBy);
  }

  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ` ORDER BY
    CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date ASC, created_at DESC`;

  return db.prepare(query).all(...params);
}

function getTaskById(id) {
  const db = getDb();
  return db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
}

function createTask(data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, status, due_date, assigned_to, created_by)
    VALUES (@title, @description, @priority, @status, @due_date, @assigned_to, @created_by)
  `).run({
    title: data.title,
    description: data.description || null,
    priority: data.priority || 'medium',
    status: data.status || 'todo',
    due_date: data.due_date || null,
    assigned_to: data.assigned_to || null,
    created_by: data.created_by || null,
  });
  return getTaskById(result.lastInsertRowid);
}

function updateTask(id, data) {
  const db = getDb();
  const fields = [];
  const params = {};
  params.id = id;

  if (data.title !== undefined)       { fields.push('title = @title'); params.title = data.title; }
  if (data.description !== undefined) { fields.push('description = @description'); params.description = data.description; }
  if (data.priority !== undefined)    { fields.push('priority = @priority'); params.priority = data.priority; }
  if (data.status !== undefined)      { fields.push('status = @status'); params.status = data.status; }
  if (data.due_date !== undefined)    { fields.push('due_date = @due_date'); params.due_date = data.due_date; }
  if (data.assigned_to !== undefined) { fields.push('assigned_to = @assigned_to'); params.assigned_to = data.assigned_to; }

  if (!fields.length) return getTaskById(id);

  fields.push(`updated_at = datetime('now','localtime')`);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getTaskById(id);
}

function deleteTask(id) {
  const db = getDb();
  const result = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return result.changes > 0;
}

function getActiveTasks(userId = null) {
  const db = getDb();
  let query = `SELECT * FROM tasks WHERE status != 'done'`;
  const params = [];
  if (userId) { query += ` AND created_by = ?`; params.push(userId); }
  query += ` ORDER BY
    CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date ASC LIMIT 20`;
  return db.prepare(query).all(...params);
}

function getOverdueTasks(userId = null) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  let query = `SELECT * FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?`;
  const params = [today];
  if (userId) { query += ` AND created_by = ?`; params.push(userId); }
  query += ` ORDER BY due_date ASC`;
  return db.prepare(query).all(...params);
}

function getTaskStats(userId = null) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  let base = '';
  const params = [];
  if (userId) { base = ` AND created_by = ?`; params.push(userId); }

  const todo = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'todo'${base}`).get(...params).c;
  const inProgress = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'${base}`).get(...params).c;
  const done = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status = 'done'${base}`).get(...params).c;
  const overdue = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?${base}`).get(today, ...params).c;

  return { todo, in_progress: inProgress, done, overdue, total: todo + inProgress + done };
}

module.exports = {
  getAllTasks, getTaskById, createTask, updateTask, deleteTask,
  getActiveTasks, getOverdueTasks, getTaskStats,
};
