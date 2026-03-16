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
    const license = await prisma.license.findFirst({
      where: { isActive: true },
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

router.post('/activate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const licenseKey = String(req.body?.license_key || '').trim().toUpperCase();
    if (!licenseKey) return res.status(400).json({ success: false, error: 'validation_error' });

    const v = validateLicenseKey(licenseKey);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const existing = await prisma.license.findFirst({ orderBy: { createdAt: 'desc' } });
    let row;
    if (existing) {
      row = await prisma.license.update({
        where: { id: existing.id },
        data: {
          licenseKey,
          licenseType: 'pro',
          activatedAt: new Date(),
          expiresAt,
          isActive: true,
        }
      });
    } else {
      row = await prisma.license.create({
        data: {
          licenseKey,
          licenseType: 'pro',
          activatedAt: new Date(),
          expiresAt,
          isActive: true,
        }
      });
    }

    res.json({ success: true, data: { id: row.id } });
  } catch (err) { next(err); }
});

module.exports = router;
