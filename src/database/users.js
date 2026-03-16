const { getDb } = require('./index');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'servis_salt_2024').digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function getAllUsers() {
  const db = getDb();
  // Check available columns
  const cols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
  const hasAccessGrantedAt = cols.includes('access_granted_at');
  const hasAccessType = cols.includes('access_type');
  const hasPhone = cols.includes('phone');
  const hasApprovalStatus = cols.includes('approval_status');

  const extraCols = [
    hasPhone ? 'u.phone' : "NULL as phone",
    hasApprovalStatus ? 'u.approval_status' : "'approved' as approval_status",
    hasAccessType ? 'u.access_type, u.access_expires_at' : 'NULL as access_type, NULL as access_expires_at',
    hasAccessGrantedAt ? 'u.access_granted_at' : 'NULL as access_granted_at',
  ].join(', ');

  return db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.is_active, u.last_login,
           u.created_at, u.updated_at, u.role_id,
           ${extraCols},
           r.name as role_name, r.display_name as role_display
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `).all();
}

function getUserById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT u.*, r.name as role_name, r.display_name as role_display, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(id);
}

function getUserByUsername(username) {
  const db = getDb();
  return db.prepare(`
    SELECT u.*, r.name as role_name, r.display_name as role_display, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = ? AND u.is_active = 1
  `).get(username);
}

function getUserByUsernameAny(username) {
  const db = getDb();
  return db.prepare(`
    SELECT u.*, r.name as role_name, r.display_name as role_display, r.permissions as role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.username = ?
  `).get(username);
}

function createUser(data) {
  const db = getDb();
  const hash = hashPassword(data.password);
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, email, phone, role_id, is_active, approval_status)
    VALUES (@username, @password_hash, @full_name, @email, @phone, @role_id, @is_active, @approval_status)
  `);
  const result = stmt.run({
    username: data.username,
    password_hash: hash,
    full_name: data.full_name || null,
    email: data.email || null,
    phone: data.phone || null,
    role_id: data.role_id || 1,
    is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    approval_status: data.approval_status || 'approved',
  });
  return getUserById(result.lastInsertRowid);
}

function registerUser(data) {
  const db = getDb();
  // Check if username exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
  if (existing) return { success: false, error: 'Bu istifadəçi adı artıq mövcuddur' };
  
  const hash = hashPassword(data.password);
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, email, phone, role_id, is_active, approval_status)
    VALUES (@username, @password_hash, @full_name, @email, @phone, @role_id, 1, 'pending')
  `);
  const result = stmt.run({
    username: data.username,
    password_hash: hash,
    full_name: data.full_name || null,
    email: data.email || null,
    phone: data.phone || null,
    role_id: 2, // Default role (non-admin)
  });
  return { success: true, data: getUserById(result.lastInsertRowid) };
}

function getPendingUsers() {
  const db = getDb();
  return db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.phone, u.created_at,
           r.name as role_name, r.display_name as role_display
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.approval_status = 'pending'
    ORDER BY u.created_at DESC
  `).all();
}

function approveUser(id, approvedById) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET approval_status = 'approved', is_active = 1, approved_by = ?, approved_at = datetime('now','localtime'), updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(approvedById, id);
  return getUserById(id);
}

function rejectUser(id, approvedById) {
  const db = getDb();
  const result = db.prepare(`
    UPDATE users SET approval_status = 'rejected', approved_by = ?, approved_at = datetime('now','localtime'), is_active = 0, updated_at = datetime('now','localtime')
    WHERE id = ? AND approval_status = 'pending'
  `).run(approvedById, id);
  return result.changes > 0;
}

function updateUser(id, data) {
  const db = getDb();
  const existing = getUserById(id);
  if (!existing) return null;

  const updates = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.role_id !== undefined) updates.role_id = data.role_id;
  if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;
  if (data.password) updates.password_hash = hashPassword(data.password);

  const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return existing;

  db.prepare(`UPDATE users SET ${fields}, updated_at = datetime('now','localtime') WHERE id = @id`)
    .run({ ...updates, id });
  return getUserById(id);
}

function deleteUser(id) {
  const db = getDb();
  return db.prepare(`UPDATE users SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`).run(id).changes > 0;
}

function loginUser(username, password) {
  const user = getUserByUsernameAny(username);
  if (!user) return { success: false, error: 'İstifadəçi tapılmadı' };
  if (!verifyPassword(password, user.password_hash)) return { success: false, error: 'Şifrə səhvdir' };
  if (!user.is_active) return { success: false, error: 'Hesabınız deaktiv edilib' };

  const isAdmin = user.role_name === 'admin' || user.username === 'admin';
  if (!isAdmin) {
    if (user.approval_status === 'pending') return { success: false, error: 'pending', isPending: true };
    if (user.approval_status === 'rejected') return { success: false, error: 'Qeydiyyatınız rədd edilib' };
    if (user.approval_status !== 'approved') return { success: false, error: 'Hesab təsdiqlənməyib' };
  }
  // Ensure admin is always marked approved
  if (isAdmin && user.approval_status !== 'approved') {
    getDb().prepare(`UPDATE users SET approval_status = 'approved' WHERE id = ?`).run(user.id);
  }

  const db = getDb();
  db.prepare(`UPDATE users SET last_login = datetime('now','localtime') WHERE id = ?`).run(user.id);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`).run(user.id, token, expiresAt);

  return { success: true, data: { ...user, token } };
}

function getUserByToken(token) {
  const db = getDb();
  const session = db.prepare(`
    SELECT s.user_id, s.expires_at
    FROM sessions s
    WHERE s.token = ? AND (s.expires_at IS NULL OR s.expires_at > datetime('now','localtime'))
  `).get(token);
  if (!session) return null;
  return getUserById(session.user_id);
}

function logout(token) {
  const db = getDb();
  return db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token).changes > 0;
}

function getUserCount() {
  const db = getDb();
  return db.prepare(`SELECT COUNT(*) as count FROM users WHERE is_active = 1`).get().count;
}

function grantAccess(userId, accessType, grantedById, customDuration = null) {
  const db = getDb();
  let expiresAt = null;
  const now = new Date();

  if (accessType === 'daily') {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 1);
    expiresAt = exp.toISOString();
  } else if (accessType === 'monthly') {
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);
    expiresAt = exp.toISOString();
  } else if (accessType === 'lifetime') {
    expiresAt = null;
  } else if (accessType === 'custom') {
    const unit = customDuration?.unit;
    const rawValue = customDuration?.value;
    const value = Number(rawValue);
    if (!unit || !Number.isFinite(value) || value <= 0) {
      return { success: false, error: 'Müddət düzgün deyil' };
    }
    let ms = 0;
    if (unit === 'minute') ms = value * 60 * 1000;
    else if (unit === 'hour') ms = value * 60 * 60 * 1000;
    else return { success: false, error: 'Müddət vahidi düzgün deyil' };
    expiresAt = new Date(now.getTime() + ms).toISOString();
  } else {
    return { success: false, error: 'Yanlış icazə növü' };
  }

  db.prepare(`
    UPDATE users SET
      access_type = ?,
      access_expires_at = ?,
      access_granted_by = ?,
      access_granted_at = datetime('now','localtime'),
      is_active = 1,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(accessType, expiresAt, grantedById, userId);

  return { success: true };
}

function revokeAccess(userId) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET
      access_type = NULL,
      access_expires_at = NULL,
      access_granted_by = NULL,
      access_granted_at = NULL,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(userId);
  return { success: true };
}

function checkUserAccess(userId) {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.username, u.access_type, u.access_expires_at, r.name as role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(userId);
  if (!user) return { hasAccess: false, reason: 'user_not_found' };
  if (user.role_name === 'admin' || user.username === 'admin') return { hasAccess: true, accessType: 'lifetime' };
  if (!user.access_type) return { hasAccess: false, reason: 'no_access' };
  if (user.access_type === 'lifetime') return { hasAccess: true, accessType: 'lifetime' };
  if (user.access_expires_at) {
    const expires = new Date(user.access_expires_at);
    if (expires < new Date()) return { hasAccess: false, reason: 'expired', expiredAt: user.access_expires_at };
  }
  return { hasAccess: true, accessType: user.access_type, expiresAt: user.access_expires_at };
}

function requestPasswordReset(username, phone, email) {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, username, full_name, phone, email
    FROM users
    WHERE username = ? AND is_active = 1
  `).get(username);
  
  if (!user) return { success: false, error: 'İstifadəçi tapılmadı' };
  
  // Verify phone or email matches
  if (phone && user.phone !== phone) return { success: false, error: 'Telefon nömrəsi uyğun gəlmir' };
  if (email && user.email !== email) return { success: false, error: 'Email ünvanı uyğun gəlmir' };
  if (!phone && !email) return { success: false, error: 'Telefon və ya email daxil edin' };
  
  // Generate reset token (valid for 1 hour)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  
  // Clear any existing reset tokens
  db.prepare(`DELETE FROM password_resets WHERE user_id = ?`).run(user.id);
  
  // Store new reset token
  db.prepare(`
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, resetToken, expiresAt);
  
  return { 
    success: true, 
    data: { 
      resetToken,
      user: { id: user.id, username: user.username, full_name: user.full_name }
    }
  };
}

function resetPassword(token, newPassword) {
  const db = getDb();
  const reset = db.prepare(`
    SELECT pr.user_id, pr.expires_at, u.username
    FROM password_resets pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.token = ? AND pr.used = 0
  `).get(token);
  
  if (!reset) return { success: false, error: 'Yanlış və ya istifadə olunmuş kod' };
  
  // Check if token expired
  if (new Date(reset.expires_at) < new Date()) {
    return { success: false, error: 'Kodun müddəti bitib' };
  }
  
  // Update password
  const passwordHash = hashPassword(newPassword);
  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(passwordHash, reset.user_id);
  
  // Mark token as used
  db.prepare(`
    UPDATE password_resets SET used = 1, used_at = datetime('now','localtime')
    WHERE token = ?
  `).run(token);
  
  return { success: true };
}

module.exports = { getAllUsers, getUserById, getUserByUsername, getUserByUsernameAny, createUser, updateUser, deleteUser, loginUser, getUserByToken, logout, getUserCount, hashPassword, verifyPassword, registerUser, getPendingUsers, approveUser, rejectUser, grantAccess, revokeAccess, checkUserAccess, requestPasswordReset, resetPassword };
