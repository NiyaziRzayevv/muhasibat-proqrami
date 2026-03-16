const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapPrice(p) {
  return {
    id: p.id,
    brand: p.brand,
    service_type: p.serviceType,
    price: p.price,
    notes: p.notes,
    created_by_id: p.createdById,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, userId } = req.query;
    const where = {};
    if (userId) where.createdById = parseInt(userId);
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { serviceType: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.priceBase.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { serviceType: 'asc' }],
    });

    res.json({ success: true, data: rows.map(mapPrice) });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.service_type && !body.serviceType) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const created = await prisma.priceBase.create({
      data: {
        brand: body.brand || null,
        serviceType: body.service_type ?? body.serviceType,
        price: body.price === undefined || body.price === null || body.price === '' ? null : Number(body.price),
        notes: body.notes || null,
        createdById: req.user.id,
      }
    });

    res.json({ success: true, data: mapPrice(created) });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};

    const updated = await prisma.priceBase.update({
      where: { id },
      data: {
        brand: body.brand ?? undefined,
        serviceType: body.service_type ?? body.serviceType ?? undefined,
        price: body.price === undefined ? undefined : (body.price === null || body.price === '' ? null : Number(body.price)),
        notes: body.notes ?? undefined,
      }
    });

    res.json({ success: true, data: mapPrice(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.priceBase.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
