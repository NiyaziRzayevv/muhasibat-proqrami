const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query;
    const where = {};
    if (userId) where.createdById = parseInt(userId);
    const rows = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    const mapped = rows.map(c => ({ id: c.id, name: c.name, description: c.description, color: c.color, created_by_id: c.createdById }));
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, color } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'validation_error' });
    const row = await prisma.category.create({
      data: {
        name,
        description: description || null,
        color: color || '#3b82f6',
        createdById: req.user.id,
      }
    });
    res.json({ success: true, data: { id: row.id, name: row.name, color: row.color } });
  } catch (err) { next(err); }
});

module.exports = router;
