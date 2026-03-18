const { Router } = require('express');
const crypto = require('crypto');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function validateLicenseKey(licenseKey) {
  const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  if (!keyPattern.test(licenseKey)) {
    return { ok: false, error: 'Lisenziya açarı formatı yanlışdır' };
  }

  const parts = licenseKey.split('-');
  const checksum = parts[3];
  const expectedChecksum = crypto
    .createHash('md5')
    .update(parts[0] + parts[1] + parts[2] + 'bms_2024')
    .digest('hex')
    .substring(0, 5)
    .toUpperCase();

  if (checksum !== expectedChecksum) {
    return { ok: false, error: 'Lisenziya açarı yanlışdır' };
  }

  return { ok: true };
}

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const machineId = String(req.query?.machine_id || '').trim();
    
    let whereClause = { isActive: true };
    if (machineId) {
      whereClause.machineId = machineId;
    }
    
    const license = await prisma.license.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    
    if (!license) {
      return res.json({ 
        success: true, 
        data: { 
          type: 'trial',
          license_type: 'trial', 
          is_active: false, 
          valid: false,
          expired: true,
          daysLeft: 0,
          days_remaining: 0 
        } 
      });
    }

    let daysRemaining = null;
    let expired = false;
    if (license.expiresAt) {
      const now = new Date();
      const expires = new Date(license.expiresAt);
      daysRemaining = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
      expired = daysRemaining <= 0;
    }

    const valid = !!license.isActive && !expired;

    res.json({ 
      success: true, 
      data: {
        type: license.licenseType,
        license_type: license.licenseType,
        is_active: license.isActive,
        valid,
        expired: expired,
        daysLeft: daysRemaining,
        expiresAt: license.expiresAt,
        activatedAt: license.activatedAt,
        licenseKey: license.licenseKey,
        machineId: license.machineId,
        expires_at: license.expiresAt,
        days_remaining: daysRemaining
      }
    });
  } catch (err) { next(err); }
});

router.post('/activate', requireAuth, async (req, res, next) => {
  try {
    const licenseKey = String(req.body?.license_key || '').trim().toUpperCase();
    if (!licenseKey) return res.status(400).json({ success: false, error: 'validation_error' });

    const v = validateLicenseKey(licenseKey);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });

    // Get machine ID from request body
    const machineId = String(req.body?.machine_id || '').trim();
    
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    // Check if license key already exists and is active
    const existingLicense = await prisma.license.findFirst({
      where: { licenseKey, isActive: true }
    });
    
    if (existingLicense) {
      // If same machine ID, allow reactivation
      if (existingLicense.machineId === machineId) {
        const updated = await prisma.license.update({
          where: { id: existingLicense.id },
          data: {
            activatedAt: new Date(),
            expiresAt,
          }
        });
        return res.json({ success: true, data: { id: updated.id } });
      } else {
        return res.status(400).json({ success: false, error: 'Bu lisenziya açarı başqa cihaz üçün istifadə olunur' });
      }
    }

    // Create new license
    const row = await prisma.license.create({
      data: {
        licenseKey,
        licenseType: 'pro',
        activatedAt: new Date(),
        expiresAt,
        machineId,
        isActive: true,
      }
    });

    res.json({ success: true, data: { id: row.id } });
  } catch (err) { next(err); }
});

router.post('/grant', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId, licenseType = 'pro', days = 365 } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'İstifadəçi ID tələb olunur' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'İstifadəçi tapılmadı' });
    }

    // Generate license key
    const licenseKey = generateLicenseKey();
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Create or update license
    const existingLicense = await prisma.license.findFirst({
      where: { isActive: true }
    });

    let license;
    if (existingLicense) {
      license = await prisma.license.update({
        where: { id: existingLicense.id },
        data: {
          licenseKey,
          licenseType,
          activatedAt: new Date(),
          expiresAt,
          isActive: true,
        }
      });
    } else {
      license = await prisma.license.create({
        data: {
          licenseKey,
          licenseType,
          activatedAt: new Date(),
          expiresAt,
          isActive: true,
        }
      });
    }

    // Update user access
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessType: 'licensed',
        accessExpiresAt: expiresAt,
        accessGrantedAt: new Date(),
      }
    });

    res.json({ 
      success: true, 
      data: { 
        licenseKey,
        expiresAt,
        userId,
        fullName: user.fullName || user.username
      } 
    });
  } catch (err) { next(err); }
});

router.post('/revoke', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'İstifadəçi ID tələb olunur' });
    }

    // Update user access
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessType: null,
        accessExpiresAt: null,
        accessGrantedAt: null,
      }
    });

    // Deactivate license
    await prisma.license.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Lisenziya ləğv edildi' });
  } catch (err) { next(err); }
});

function generateLicenseKey(prefix = 'BMS01') {
  const crypto = require('crypto');
  const part1 = String(prefix || 'BMS01').padEnd(5, '0').substring(0, 5).toUpperCase();
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

module.exports = router;
