const { getDb } = require('./index');

function getAllCategories(userId = null) {
  const db = getDb();
  let q = `
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (userId) { q += ` AND c.created_by = ?`; params.push(userId); }
  q += ` GROUP BY c.id ORDER BY c.name ASC`;
  return db.prepare(q).all(...params);
}

function getCategoryById(id) {
  return getDb().prepare(`SELECT * FROM categories WHERE id = ?`).get(id);
}

function createCategory(data) {
  const db = getDb();
  const result = db.prepare(`INSERT INTO categories (name, description, color, created_by) VALUES (?, ?, ?, ?)`).run(
    data.name, data.description || null, data.color || '#3b82f6', data.created_by || null
  );
  return getCategoryById(result.lastInsertRowid);
}

function updateCategory(id, data) {
  const db = getDb();
  db.prepare(`UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?`).run(
    data.name, data.description || null, data.color || '#3b82f6', id
  );
  return getCategoryById(id);
}

function deleteCategory(id, userId = null) {
  if (userId) return getDb().prepare(`DELETE FROM categories WHERE id = ? AND created_by = ?`).run(id, userId);
  return getDb().prepare(`DELETE FROM categories WHERE id = ?`).run(id);
}

function seedDefaultCategories() {
  const db = getDb();
  const existing = db.prepare(`SELECT COUNT(*) as c FROM categories`).get();
  if (existing.c > 0) return;
  const defaults = [
    { name: 'Yağlar', color: '#f59e0b' },
    { name: 'Filtrlər', color: '#10b981' },
    { name: 'Ehtiyat hissələri', color: '#3b82f6' },
    { name: 'Elektronika', color: '#8b5cf6' },
    { name: 'Aksesuarlar', color: '#ec4899' },
    { name: 'Kimyəvi maddələr', color: '#ef4444' },
    { name: 'Digər', color: '#64748b' },
  ];
  const stmt = db.prepare(`INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)`);
  for (const c of defaults) stmt.run(c.name, c.color);
}

module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory, seedDefaultCategories };
