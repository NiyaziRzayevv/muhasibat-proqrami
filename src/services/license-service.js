const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// ─── RSA PUBLIC KEY (embedded) ─────────────────────────────────────────────
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx1RLCPJOBskAU/EBbDAP
BgtS1i+I/g8IoKveSGjc0rqK4bZJR9UpslxujdJNj1HW4AhKmpOHv+dnxC3HI6cR
GxmaJFRih0PCC0Y7OS8waBs8oF3egdospPSnEXsV60E25vZCYOV9kR1Ui55Eg2s2
DpBfKLOH6UsMK/xUon7A9jCwxgu6x1i9D8x2I05Rmrpo8fPcEHPu+51E+qqdb9pn
1SMfJ9cLUuSkHwTc1BHUPAPnER1z4e4aio/qHHaDqRFe2HBtgIH9s0pec2VXxrb7
8jNeHRhshF8Qa/CFFmRAgLq2mGHZKd9HpxQOoELFVxQtj8k7/Jpvc341f/HuuYTu
iQIDAQAB
-----END PUBLIC KEY-----`;

// ─── Device Fingerprint ────────────────────────────────────────────────────
function generateDeviceId() {
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';
  const data = [
    os.hostname(),
    os.platform(),
    os.arch(),
    cpuModel,
    os.totalmem().toString(),
    (os.networkInterfaces().Ethernet || os.networkInterfaces().eth0 || [])
      .filter(i => i.mac && i.mac !== '00:00:00:00:00:00')
      .map(i => i.mac).join(','),
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32).toUpperCase();
}

// ─── License File Paths (dual storage for anti-crack) ──────────────────────
function getLicensePaths() {
  const appData = app.getPath('userData');
  const primary = path.join(appData, '.license.enc');
  const backup = path.join(appData, '..', '.smartqeyd_lic.dat');
  return { primary, backup };
}

// ─── AES Encryption/Decryption ─────────────────────────────────────────────
const AES_KEY = crypto.createHash('sha256').update('SmartQeyd_LIC_2024_' + os.hostname()).digest();
const AES_IV_LEN = 16;

function encryptData(text) {
  const iv = crypto.randomBytes(AES_IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptData(encrypted) {
  const [ivHex, data] = encrypted.split(':');
  if (!ivHex || !data) return null;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─── License Storage ───────────────────────────────────────────────────────
function saveLicense(licenseData, signature) {
  const payload = JSON.stringify({ license: licenseData, signature });
  const encrypted = encryptData(payload);
  const paths = getLicensePaths();

  try { fs.mkdirSync(path.dirname(paths.primary), { recursive: true }); } catch {}
  try { fs.mkdirSync(path.dirname(paths.backup), { recursive: true }); } catch {}

  fs.writeFileSync(paths.primary, encrypted, 'utf8');
  try { fs.writeFileSync(paths.backup, encrypted, 'utf8'); } catch {}

  // Save last launch time
  saveLastLaunchTime();
}

function loadLicense() {
  const paths = getLicensePaths();
  let encrypted = null;

  // Try primary first
  try {
    if (fs.existsSync(paths.primary)) {
      encrypted = fs.readFileSync(paths.primary, 'utf8');
    }
  } catch {}

  // Fallback to backup
  if (!encrypted) {
    try {
      if (fs.existsSync(paths.backup)) {
        encrypted = fs.readFileSync(paths.backup, 'utf8');
        // Restore primary from backup
        try { fs.writeFileSync(paths.primary, encrypted, 'utf8'); } catch {}
      }
    } catch {}
  }

  if (!encrypted) return null;

  try {
    const decrypted = decryptData(encrypted);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

function deleteLicense() {
  const paths = getLicensePaths();
  try { fs.unlinkSync(paths.primary); } catch {}
  try { fs.unlinkSync(paths.backup); } catch {}
}

// ─── Time Manipulation Protection ──────────────────────────────────────────
function getTimePath() {
  return path.join(app.getPath('userData'), '.tcheck');
}

function saveLastLaunchTime() {
  try {
    const data = encryptData(JSON.stringify({ ts: Date.now() }));
    fs.writeFileSync(getTimePath(), data, 'utf8');
  } catch {}
}

function checkTimeManipulation() {
  try {
    const timePath = getTimePath();
    if (!fs.existsSync(timePath)) return { ok: true };
    const encrypted = fs.readFileSync(timePath, 'utf8');
    const decrypted = decryptData(encrypted);
    const { ts } = JSON.parse(decrypted);
    if (Date.now() < ts - 60000) {
      // System clock went backwards by more than 1 minute
      return { ok: false, reason: 'Sistem vaxtı geri çəkilib. Proqram bloklanıb.' };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// ─── RSA Signature Verification ────────────────────────────────────────────
function verifyLicenseSignature(licenseJson, signatureBase64) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(licenseJson));
    verify.end();
    return verify.verify(PUBLIC_KEY, signatureBase64, 'base64');
  } catch {
    return false;
  }
}

// ─── License Validation Engine ─────────────────────────────────────────────
function validateLicense() {
  // 1. Time manipulation check
  const timeCheck = checkTimeManipulation();
  if (!timeCheck.ok) {
    return { valid: false, reason: timeCheck.reason, blocked: true };
  }

  // 2. Load license
  const stored = loadLicense();
  if (!stored || !stored.license || !stored.signature) {
    return { valid: false, reason: 'Lisenziya tapılmadı', needActivation: true };
  }

  const lic = stored.license;
  const sig = stored.signature;

  // 3. Verify RSA signature
  if (!verifyLicenseSignature(lic, sig)) {
    return { valid: false, reason: 'Lisenziya imzası yanlışdır', needActivation: true };
  }

  // 4. Check device ID
  const currentDeviceId = generateDeviceId();
  if (lic.deviceId !== currentDeviceId) {
    return { valid: false, reason: 'Bu lisenziya başqa cihaz üçündür', needActivation: true };
  }

  // 5. Check product
  if (lic.product !== 'SmartQeyd') {
    return { valid: false, reason: 'Lisenziya bu proqram üçün deyil', needActivation: true };
  }

  // 6. Check expiration
  if (lic.type !== 'lifetime' && lic.expiresAt) {
    const expiresAt = new Date(lic.expiresAt);
    if (Date.now() > expiresAt.getTime()) {
      const daysExpired = Math.ceil((Date.now() - expiresAt.getTime()) / 86400000);
      return { valid: false, reason: `Lisenziya müddəti ${daysExpired} gün əvvəl bitib`, expired: true, needActivation: true };
    }
  }

  // 7. Check maxRuns
  if (lic.maxRuns !== null && lic.maxRuns !== undefined) {
    const runsUsed = getRunCount();
    if (runsUsed >= lic.maxRuns) {
      return { valid: false, reason: `Maksimum istifadə sayı (${lic.maxRuns}) bitib`, needActivation: true };
    }
    incrementRunCount();
  }

  // Update last launch time
  saveLastLaunchTime();

  // Calculate days left
  let daysLeft = null;
  if (lic.type !== 'lifetime' && lic.expiresAt) {
    daysLeft = Math.max(0, Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  }

  return {
    valid: true,
    license: {
      licenseId: lic.licenseId,
      type: lic.type,
      expiresAt: lic.expiresAt,
      issuedAt: lic.issuedAt,
      daysLeft,
      deviceId: lic.deviceId,
    },
  };
}

// ─── Run Counter ───────────────────────────────────────────────────────────
function getRunCountPath() {
  return path.join(app.getPath('userData'), '.rcount');
}

function getRunCount() {
  try {
    const data = fs.readFileSync(getRunCountPath(), 'utf8');
    const decrypted = decryptData(data);
    return JSON.parse(decrypted).count || 0;
  } catch { return 0; }
}

function incrementRunCount() {
  try {
    const count = getRunCount() + 1;
    const data = encryptData(JSON.stringify({ count }));
    fs.writeFileSync(getRunCountPath(), data, 'utf8');
  } catch {}
}

// ─── Activate License ──────────────────────────────────────────────────────
function activateLicenseKey(licenseString) {
  try {
    // licenseString format: base64(JSON) + '.' + base64(signature)
    const parts = licenseString.trim().split('.');
    if (parts.length !== 2) {
      return { success: false, error: 'Lisenziya açarı formatı yanlışdır' };
    }

    const licenseJson = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
    const signature = parts[1];

    // Verify signature
    if (!verifyLicenseSignature(licenseJson, signature)) {
      return { success: false, error: 'Lisenziya imzası doğrulanmadı' };
    }

    // Check device ID
    const currentDeviceId = generateDeviceId();
    if (licenseJson.deviceId !== currentDeviceId) {
      return { success: false, error: 'Bu lisenziya bu cihaz üçün deyil. Device ID uyğun gəlmir.' };
    }

    // Check product
    if (licenseJson.product !== 'SmartQeyd') {
      return { success: false, error: 'Bu lisenziya SmartQeyd üçün deyil' };
    }

    // Check if already expired
    if (licenseJson.type !== 'lifetime' && licenseJson.expiresAt) {
      if (Date.now() > new Date(licenseJson.expiresAt).getTime()) {
        return { success: false, error: 'Bu lisenziya artıq müddəti bitmiş açardır' };
      }
    }

    // Save license
    saveLicense(licenseJson, signature);

    return { success: true, data: validateLicense() };
  } catch (e) {
    return { success: false, error: 'Lisenziya açarı oxuna bilmədi: ' + e.message };
  }
}

// ─── Demo Mode ─────────────────────────────────────────────────────────────
function activateDemo() {
  const deviceId = generateDeviceId();
  const demoLicense = {
    licenseId: crypto.randomUUID(),
    product: 'SmartQeyd',
    deviceId,
    type: 'demo',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    maxRuns: null,
    issuedAt: new Date().toISOString(),
  };

  // Self-sign demo with a special demo marker (not RSA signed, but locally validated)
  const demoPayload = JSON.stringify({ license: demoLicense, signature: 'DEMO', isDemo: true });
  const encrypted = encryptData(demoPayload);
  const paths = getLicensePaths();
  try { fs.writeFileSync(paths.primary, encrypted, 'utf8'); } catch {}
  try { fs.writeFileSync(paths.backup, encrypted, 'utf8'); } catch {}
  saveLastLaunchTime();

  return { success: true, expiresAt: demoLicense.expiresAt };
}

// Override validateLicense to also handle demo
const _originalValidate = validateLicense;
function validateLicenseFull() {
  const stored = loadLicense();
  if (stored && stored.isDemo) {
    // Demo mode - only check expiration
    const lic = stored.license;
    if (!lic) return { valid: false, needActivation: true, reason: 'Demo tapılmadı' };
    if (Date.now() > new Date(lic.expiresAt).getTime()) {
      deleteLicense();
      return { valid: false, needActivation: true, reason: 'Demo müddəti bitdi (10 dəqiqə)', demoExpired: true };
    }
    const timeCheck = checkTimeManipulation();
    if (!timeCheck.ok) return { valid: false, reason: timeCheck.reason, blocked: true };
    saveLastLaunchTime();
    const msLeft = new Date(lic.expiresAt).getTime() - Date.now();
    return {
      valid: true,
      isDemo: true,
      license: {
        licenseId: lic.licenseId,
        type: 'demo',
        expiresAt: lic.expiresAt,
        issuedAt: lic.issuedAt,
        daysLeft: 0,
        minutesLeft: Math.max(0, Math.ceil(msLeft / 60000)),
        deviceId: lic.deviceId,
      },
    };
  }
  return _originalValidate();
}

// ─── Get License Status ────────────────────────────────────────────────────
function getLicenseStatus() {
  return validateLicenseFull();
}

// ─── RSA PRIVATE KEY (for admin license generation) ─────────────────────────
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDHVEsI8k4GyQBT
8QFsMA8GC1LWL4j+Dwigq95IaNzSuorhtklH1SmyXG6N0k2PUdbgCEqak4e/52fE
LccjpxEbGZokVGKHQ8ILRjs5LzBoGzygXd6B2iyk9KcRexXrQTbm9kJg5X2RHVSL
nkSDazYOkF8os4fpSwwr/FSifsD2MLDGC7rHWL0PzHYjTlGaumjx89wQc+77nUT6
qp1v2mfVIx8n1wtS5KQfBNzUEdQ8A+cRHXPh7hqKj+ocdoOpEV7YcG2Agf2zSl5z
ZVfGtvvyM14dGGyEXxBr8IUWZECAuraYYdkp30enFA6gQsVXFC2PyTv8mm9zfjV/
8e65hO6JAgMBAAECggEAAwHbzvL+593M9jc+3v+7nkr58TbO4YxfBDOLmzqPyFMd
qMmcAewuoJ0B4vxfBLBGpmMhowLiS6wlVeGd7UUGPkss1ur6AJHuYcapupNibtOo
XsADzSA6R7PUOHCLtFyrxCDHgBg+RHv1jFSzMmth6abWdLH+tS+Xa6t3KGtypFQx
aXYQycH8+6NJggxJKYyEusLYeBQnWDD/LLwo+U2es3lInVHQKKrsOXFiaWk+11Zt
iv+i7WW1YMleORZUjsg3MbSHxBMssngnV9YRR0aHN33KqpIJe/h2RnK3UWkLYnwc
ScpIbzArGiJLMtfyzol80rdrNhM7jqzKXv7dGhOGjQKBgQDk6DMLn2+IIZOuzKRh
9HICuJ7NkKF7Wmw1bNH+pDM7b5eRRLup/ACDdhICreYDzormAtwqVugBAfG3ONWi
OkmUzJqkn8I26zxqQc3RVkGiBc2wrKwzfObxNxpY7kasoOT7OJnqDt7Q7md2fKkN
ymhnyUJNdx/N3/aDVOInfnua7QKBgQDe6+X0Ix1AKR6Gpyyh9CszFL3Kv5y/RbUC
79KceY2rXn5kPXx6ZOp/tzmz0XdJYhNY2J0XTiTnXt6JP4dXFFlefQ0if80794n0
+Rt57DQ8mLORxWxF+Qx64oEuIWteh97aRnQurREWprTsQArz0LBW+QRkyAi9bu7s
7pwE3g3CjQKBgB8e6oG0BWfOmNN1AwxGPZHdI8ny1eF9Y6THzK0ACe8UttiLLbBo
kHFPBhfTKKhv1jZ7QQ+IjTZF22T7lx/dKM/QGV40UiVBSg9wLtk9DuNGQra4YxkE
7CjzQuPAUV966Ga3RUWrC+P/5ZUYUauMTzF9DUSW434L6unkCnMwIQHpAoGBAIIR
hE/puSR5mY0Zt+obTKV2YbMOEEhuRMqc4fdY2Td3YCne0mWbwlOYtftcqcxQhFdf
tHEnsFKrwQ612aMOhYKjVmmdxkNKEN22B7kg/+2nb4cLeTxur0B4LsWazEoQ3w/e
8eVWJ9VemcwLJhjS2EE29MBVEvxs4M2v/6q7Ya31AoGBAMDEofEXDiNBD6zF2hdn
q7jlRo9TJcboV776QxyfJLutfDAW6g7jfcLzzKYJslHJWMqBdOxJPYtWEKEfXdrI
E/SHbNnnP2+NCNNtiMx96aSzOVacDSQBoPaMzK9JyE8kGhRARKYo6TEUD9A5B0Pk
ZAKoq0RdNrwisxik1w59h3V9
-----END PRIVATE KEY-----`;

// ─── Admin: Generate License Key ────────────────────────────────────────────
// durationType: 'minutes' | 'hours' | 'days' | 'months' | 'lifetime'
// durationValue: number (ignored for lifetime)
function generateLicenseForDevice(deviceId, durationType, durationValue) {
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

  const license = {
    licenseId: crypto.randomUUID(),
    product: 'SmartQeyd',
    deviceId: deviceId.toUpperCase(),
    type,
    expiresAt,
    maxRuns: null,
    issuedAt: new Date().toISOString(),
  };

  // Sign with private key
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(license));
  sign.end();
  const signature = sign.sign(PRIVATE_KEY, 'base64');

  const licenseKey = Buffer.from(JSON.stringify(license)).toString('base64') + '.' + signature;

  return { license, signature, licenseKey };
}

module.exports = {
  generateDeviceId,
  validateLicense: validateLicenseFull,
  activateLicenseKey,
  activateDemo,
  getLicenseStatus,
  deleteLicense,
  saveLicense,
  loadLicense,
  generateLicenseForDevice,
  PUBLIC_KEY,
};
