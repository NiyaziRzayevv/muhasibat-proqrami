const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapVehicle(v, computed = {}) {
  return {
    id: v.id,
    customer_id: v.customerId,
    customer_name: v.customer?.name || null,
    brand: v.brand,
    model: v.model,
    plate: v.plate,
    year: v.year,
    notes: v.notes,
    created_at: v.createdAt,
    created_by_id: v.createdById,
    service_count: computed.service_count ?? 0,
    total_spent: computed.total_spent ?? 0,
    last_service: computed.last_service ?? null,
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
        { model: { contains: search, mode: 'insensitive' } },
        { plate: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        customer: true,
        records: { select: { date: true, totalPrice: true } },
      },
      orderBy: { id: 'desc' },
    });

    const mapped = vehicles.map(v => {
      const records = Array.isArray(v.records) ? v.records : [];
      const service_count = records.length;
      const total_spent = records.reduce((s, r) => s + (r.totalPrice || 0), 0);
      const last_service = records.reduce((m, r) => (!m || (r.date && r.date > m) ? r.date : m), null);
      return mapVehicle(v, { service_count, total_spent, last_service });
    });

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const v = await prisma.vehicle.findUnique({
      where: { id },
      include: { customer: true, records: true },
    });
    if (!v) return res.status(404).json({ success: false, error: 'Aktiv tapılmadı' });

    const records = Array.isArray(v.records) ? v.records : [];
    const service_count = records.length;
    const total_spent = records.reduce((s, r) => s + (r.totalPrice || 0), 0);
    const last_service = records.reduce((m, r) => (!m || (r.date && r.date > m) ? r.date : m), null);

    res.json({ success: true, data: mapVehicle(v, { service_count, total_spent, last_service }) });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};

    const created = await prisma.vehicle.create({
      data: {
        customerId: body.customer_id ? parseInt(body.customer_id) : (body.customerId ? parseInt(body.customerId) : null),
        brand: body.brand ?? null,
        model: body.model ?? null,
        plate: body.plate ?? null,
        year: body.year === '' || body.year === null || body.year === undefined ? null : Number(body.year),
        notes: body.notes ?? null,
        createdById: req.user.id,
      },
      include: { customer: true, records: { select: { date: true, totalPrice: true } } },
    });

    res.json({ success: true, data: mapVehicle(created) });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        customerId: body.customer_id === undefined && body.customerId === undefined
          ? undefined
          : (body.customer_id || body.customerId ? parseInt(body.customer_id || body.customerId) : null),
        brand: body.brand ?? undefined,
        model: body.model ?? undefined,
        plate: body.plate ?? undefined,
        year: body.year === undefined ? undefined : (body.year === '' || body.year === null ? null : Number(body.year)),
        notes: body.notes ?? undefined,
      },
      include: { customer: true, records: { select: { date: true, totalPrice: true } } },
    });

    res.json({ success: true, data: mapVehicle(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.vehicle.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
