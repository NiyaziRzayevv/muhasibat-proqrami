const { Router } = require('express');
const crypto = require('crypto');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

const router = Router();

function generateLicenseKey(prefix = 'BMS01') {
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

router.post('/generate-key', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { prefix } = req.body || {};
    const key = generateLicenseKey(prefix);
    res.json({ success: true, data: key });
  } catch (err) { next(err); }
});

module.exports = router;
