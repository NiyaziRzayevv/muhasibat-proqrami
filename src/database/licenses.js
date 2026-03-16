const { getDb } = require('./index');
const crypto = require('crypto');
const os = require('os');

function getMachineId() {
  const data = os.hostname() + os.platform() + os.arch();
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 16).toUpperCase();
}

function getLicense() {
  return getDb().prepare(`SELECT * FROM licenses ORDER BY id DESC LIMIT 1`).get();
}

function initTrial() {
  const db = getDb();
  const existing = getLicense();
  if (existing) return existing;

  const trialDays = 14;
  const expiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO licenses (license_key, license_type, activated_at, expires_at, machine_id, is_active)
    VALUES (?, 'trial', datetime('now','localtime'), ?, ?, 1)
  `).run('TRIAL-' + getMachineId(), expiresAt, getMachineId());
  return getLicense();
}

function activateLicense(licenseKey) {
  const db = getDb();
  const machineId = getMachineId();

  // Offline activation: validate key format (XXXXX-XXXXX-XXXXX-XXXXX)
  const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  if (!keyPattern.test(licenseKey)) {
    return { success: false, error: 'Lisenziya açarı formatı yanlışdır' };
  }

  // Simple offline checksum validation
  const parts = licenseKey.split('-');
  const checksum = parts[3];
  const expectedChecksum = crypto
    .createHash('md5')
    .update(parts[0] + parts[1] + parts[2] + 'bms_2024')
    .digest('hex')
    .substring(0, 5)
    .toUpperCase();

  if (checksum !== expectedChecksum) {
    return { success: false, error: 'Lisenziya açarı yanlışdır' };
  }

  // Determine duration from key prefix
  const prefix = parts[0];
  let days = 365;
  let licType = 'pro';
  if (prefix.startsWith('M30')) { days = 30; licType = 'monthly'; }
  else if (prefix.startsWith('M90')) { days = 90; licType = 'quarterly'; }
  else if (prefix.startsWith('Y1')) { days = 365; licType = 'yearly'; }

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const existing = getLicense();
  if (existing) {
    db.prepare(`
      UPDATE licenses SET license_key=?, license_type=?, activated_at=datetime('now','localtime'),
      expires_at=?, machine_id=?, is_active=1 WHERE id=?
    `).run(licenseKey, licType, expiresAt, machineId, existing.id);
  } else {
    db.prepare(`
      INSERT INTO licenses (license_key, license_type, activated_at, expires_at, machine_id, is_active)
      VALUES (?, ?, datetime('now','localtime'), ?, ?, 1)
    `).run(licenseKey, licType, expiresAt, machineId);
  }

  return { success: true, data: getLicense() };
}

function getLicenseStatus() {
  const license = getLicense();
  if (!license) {
    return { valid: false, type: 'none', expired: true, daysLeft: 0 };
  }

  const now = new Date();
  const expires = new Date(license.expires_at);
  const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
  const expired = daysLeft <= 0;

  return {
    valid: !expired && license.is_active === 1,
    type: license.license_type,
    expired,
    daysLeft: Math.max(0, daysLeft),
    expiresAt: license.expires_at,
    activatedAt: license.activated_at,
    licenseKey: license.license_key,
    machineId: getMachineId(),
  };
}

// Generate a valid license key
// duration: 30 | 90 | 365
function generateLicenseKey(duration = 365) {
  let prefix;
  if (duration <= 30) prefix = 'M30';
  else if (duration <= 90) prefix = 'M90';
  else prefix = 'Y1000';

  const part1 = prefix.padEnd(5, '0').substring(0, 5).toUpperCase();
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const part3 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const checksum = crypto
    .createHash('md5')
    .update(part1 + part2 + part3 + 'bms_2024')
    .digest('hex')
    .substring(0, 5)
    .toUpperCase();
  return `${part1}-${part2}-${part3}-${checksum}`;
}

module.exports = { getLicense, initTrial, activateLicense, getLicenseStatus, generateLicenseKey, getMachineId };
