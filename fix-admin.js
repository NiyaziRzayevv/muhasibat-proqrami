const { getDb } = require('./src/database');
const db = getDb();

// Update admin approval status
const result = db.prepare(`
  UPDATE users 
  SET approval_status = 'approved', approved_by = NULL, approved_at = datetime('now','localtime')
  WHERE username = 'admin' 
     OR role_id IN (SELECT id FROM roles WHERE name = 'admin')
`).run();

console.log('Updated rows:', result.changes);

// Check admin status
const admin = db.prepare(`
  SELECT username, approval_status, role_name 
  FROM users u 
  LEFT JOIN roles r ON u.role_id = r.id 
  WHERE username = 'admin'
`).get();

console.log('Admin status:', admin);
console.log('Fix completed!');
