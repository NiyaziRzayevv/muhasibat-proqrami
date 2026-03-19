const { getDb } = require('./index');
const crypto = require('crypto');

const SECRET = 'SQ_2024_LICENSE_KEY_SECRET';

// ─── Encode license info into key ───────────────────────────────────────────
// Key format: SQ-<type_code><duration_hex>-<random>-<checksum>
// type_code: L=lifetime, M=minutes, H=hours, D=days, O=months
// duration_hex: hex of duration value (00 for lifetime)
// This makes the key self-validating - no need to look up in DB on other PC
function _encodeKey(durationType, durationValue) {
  const typeMap = { lifetime: 'L', minutes: 'M', hours: 'H', days: 'D', months: 'O' };
  const tc = typeMap[durationType] || 'D';
  const dv = durationType === 'lifetime' ? 0 : (durationValue || 30);
  const dvHex = dv.toString(16).toUpperCase().padStart(4, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const payload = `${tc}${dvHex}-${rand}`;
  const checksum = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').substring(0, 5).toUpperCase();
  return `SQ-${tc}${dvHex}-${rand}-${checksum}`;
}

// ─── Decode & validate key ──────────────────────────────────────────────────
function _decodeKey(licenseKey) {
  const trimmed = (licenseKey || '').trim().toUpperCase();
  const match = trimmed.match(/^SQ-([LMHDO])([0-9A-F]{4})-([A-Z0-9]{5})-([A-Z0-9]{5})$/);
  if (!match) return null;

  const [, tc, dvHex, rand, checksum] = match;
  const payload = `${tc}${dvHex}-${rand}`;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').substring(0, 5).toUpperCase();
  if (checksum !== expected) return null;

  const typeMap = { L: 'lifetime', M: 'minutes', H: 'hours', D: 'days', O: 'months' };
  const durationType = typeMap[tc] || 'days';
  const durationValue = parseInt(dvHex, 16);

  return { durationType, durationValue };
}

// ─── Calculate expires_at from duration ─────────────────────────────────────
function _calcExpiresAt(durationType, durationValue) {
  if (durationType === 'lifetime') return null;
  const now = Date.now();
  const ms = {
    minutes: durationValue * 60 * 1000,
    hours: durationValue * 60 * 60 * 1000,
    days: durationValue * 24 * 60 * 60 * 1000,
    months: durationValue * 30 * 24 * 60 * 60 * 1000,
  }[durationType] || durationValue * 24 * 60 * 60 * 1000;
  return new Date(now + ms).toISOString();
}

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
// Self-validating: decodes key to get duration info, creates new license record
function activateUserLicense(userId, licenseKey) {
  const db = getDb();
  const trimmed = (licenseKey || '').trim().toUpperCase();

  // First check if this key was already activated by this user
  const existing = db.prepare(`SELECT * FROM user_licenses WHERE license_key = ? AND user_id = ? AND status = 'active'`).get(trimmed, userId);
  if (existing) {
    return { success: false, error: 'Bu açar artıq aktiv edilib' };
  }

  // Check if key was already used by another user
  const usedByOther = db.prepare(`SELECT * FROM user_licenses WHERE license_key = ? AND user_id != ? AND status = 'active'`).get(trimmed, userId);
  if (usedByOther) {
    return { success: false, error: 'Bu açar artıq başqa istifadəçi tərəfindən istifadə olunur' };
  }

  // Decode and validate the key itself (self-validating)
  const decoded = _decodeKey(trimmed);
  if (!decoded) {
    return { success: false, error: 'Lisenziya açarı yanlışdır' };
  }

  const { durationType, durationValue } = decoded;
  const type = durationType === 'lifetime' ? 'lifetime' : 'timed';
  const expiresAt = _calcExpiresAt(durationType, durationValue);

  // Deactivate any previous active license for this user
  db.prepare(`UPDATE user_licenses SET status = 'expired', updated_at = datetime('now','localtime') WHERE user_id = ? AND status = 'active'`).run(userId);

  // Create new license record
  db.prepare(`
    INSERT INTO user_licenses (license_key, user_id, type, status, issued_by, expires_at, activated_at, created_at, updated_at)
    VALUES (?, ?, ?, 'active', NULL, ?, datetime('now','localtime'), datetime('now','localtime'), datetime('now','localtime'))
  `).run(trimmed, userId, type, expiresAt);

  return { success: true, data: checkUserLicense(userId) };
}

// ─── Generate license key (admin only) ───────────────────────────────────────
function generateUserLicense(durationType, durationValue, issuedByAdminId, targetUserId) {
  const db = getDb();
  const licenseKey = _encodeKey(durationType, durationValue);
  const type = durationType === 'lifetime' ? 'lifetime' : 'timed';
  const expiresAt = targetUserId ? _calcExpiresAt(durationType, durationValue) : null;

  // Only insert into local DB if target user is specified (same PC)
  if (targetUserId) {
    db.prepare(`
      INSERT INTO user_licenses (license_key, user_id, type, status, issued_by, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, datetime('now','localtime'), datetime('now','localtime'))
    `).run(licenseKey, targetUserId, type, issuedByAdminId, expiresAt);
  } else {
    // Just record that key was generated (no user yet, status = pending)
    db.prepare(`
      INSERT INTO user_licenses (license_key, user_id, type, status, issued_by, expires_at, created_at, updated_at)
      VALUES (?, NULL, ?, 'pending', ?, NULL, datetime('now','localtime'), datetime('now','localtime'))
    `).run(licenseKey, type, issuedByAdminId);
  }

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
