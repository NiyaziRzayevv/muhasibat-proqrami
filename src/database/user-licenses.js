const { getDb } = require('./index');
const crypto = require('crypto');

// ─── Check user license status ───────────────────────────────────────────────
function checkUserLicense(userId) {
  const db = getDb();
  const lic = db.prepare(`
    SELECT * FROM user_licenses
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  if (!lic) return { valid: false, reason: 'no_license' };

  // Check expiration for timed licenses
  if (lic.type !== 'lifetime' && lic.expires_at) {
    const now = new Date();
    const expires = new Date(lic.expires_at);
    if (now > expires) {
      // Mark as expired
      db.prepare(`UPDATE user_licenses SET status = 'expired', updated_at = datetime('now','localtime') WHERE id = ?`).run(lic.id);
      return { valid: false, reason: 'expired', expiredAt: lic.expires_at };
    }
    const msLeft = expires.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
    return { valid: true, license: { ...lic, daysLeft } };
  }

  // Lifetime
  return { valid: true, license: { ...lic, daysLeft: null } };
}

// ─── Activate license key for user ───────────────────────────────────────────
function activateUserLicense(userId, licenseKey) {
  const db = getDb();
  const trimmed = licenseKey.trim();

  // Find the license key
  const lic = db.prepare(`SELECT * FROM user_licenses WHERE license_key = ?`).get(trimmed);
  if (!lic) return { success: false, error: 'Lisenziya açarı tapılmadı' };

  // Already used by another user
  if (lic.user_id && lic.user_id !== userId && lic.status === 'active') {
    return { success: false, error: 'Bu açar artıq başqa istifadəçi tərəfindən istifadə olunur' };
  }

  // Already expired
  if (lic.status === 'expired') {
    return { success: false, error: 'Bu açarın müddəti bitib' };
  }

  // Already used (one-time)
  if (lic.status === 'used') {
    return { success: false, error: 'Bu açar artıq istifadə olunub' };
  }

  // Bind to user and activate
  db.prepare(`
    UPDATE user_licenses 
    SET user_id = ?, status = 'active', activated_at = datetime('now','localtime'), updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(userId, lic.id);

  return { success: true, data: checkUserLicense(userId) };
}

// ─── Generate license key (admin only) ───────────────────────────────────────
function generateUserLicense(durationType, durationValue, issuedByAdminId, targetUserId) {
  const db = getDb();

  let expiresAt = null;
  let type = 'timed';

  if (durationType === 'lifetime') {
    type = 'lifetime';
    expiresAt = null;
  } else {
    const now = Date.now();
    const ms = {
      minutes: durationValue * 60 * 1000,
      hours: durationValue * 60 * 60 * 1000,
      days: durationValue * 24 * 60 * 60 * 1000,
      months: durationValue * 30 * 24 * 60 * 60 * 1000,
    }[durationType] || durationValue * 24 * 60 * 60 * 1000;
    expiresAt = new Date(now + ms).toISOString();
  }

  // Generate unique key: SQ-XXXXX-XXXXX-XXXXX
  const p1 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const p2 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const p3 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const licenseKey = `SQ-${p1}-${p2}-${p3}`;

  db.prepare(`
    INSERT INTO user_licenses (license_key, user_id, type, status, issued_by, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  `).run(licenseKey, targetUserId || null, type, issuedByAdminId, expiresAt);

  return {
    licenseKey,
    type,
    durationType,
    durationValue,
    expiresAt,
    userId: targetUserId || null,
  };
}

// ─── Get all licenses (admin view) ──────────────────────────────────────────
function getAllUserLicenses() {
  const db = getDb();
  return db.prepare(`
    SELECT ul.*, u.username as user_name, u.full_name as user_full_name, a.username as issued_by_name
    FROM user_licenses ul
    LEFT JOIN users u ON ul.user_id = u.id
    LEFT JOIN users a ON ul.issued_by = a.id
    ORDER BY ul.created_at DESC
  `).all();
}

// ─── Expire overdue licenses (called on startup / periodically) ─────────────
function expireOverdueLicenses() {
  const db = getDb();
  const result = db.prepare(`
    UPDATE user_licenses 
    SET status = 'expired', updated_at = datetime('now','localtime')
    WHERE status = 'active' AND type != 'lifetime' AND expires_at IS NOT NULL AND expires_at < datetime('now','localtime')
  `).run();
  return result.changes;
}

// ─── Revoke license (admin) ─────────────────────────────────────────────────
function revokeUserLicense(licenseId) {
  const db = getDb();
  db.prepare(`UPDATE user_licenses SET status = 'revoked', updated_at = datetime('now','localtime') WHERE id = ?`).run(licenseId);
  return { success: true };
}

module.exports = {
  checkUserLicense,
  activateUserLicense,
  generateUserLicense,
  getAllUserLicenses,
  expireOverdueLicenses,
  revokeUserLicense,
};
