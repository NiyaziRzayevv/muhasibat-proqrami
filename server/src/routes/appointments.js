const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapAppointment(a) {
  if (!a) return a;
  return {
    ...a,
    customer_id: a.customerId,
    customer_name: a.customerName,
    created_by: a.createdById,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, status, date, startDate, endDate, customerId, customer_id, userId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (date) where.date = date;
    if (startDate && endDate) where.date = { gte: startDate, lte: endDate };

    const cid = customerId || customer_id;
    if (cid) where.customerId = parseInt(cid);
    if (userId) where.createdById = parseInt(userId);

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const items = await prisma.appointment.findMany({
      where,
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    res.json({ success: true, data: items.map(mapAppointment) });
  } catch (err) { next(err); }
});

router.get('/upcoming', requireAuth, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 3;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    const where = {
      date: { gte: today, lte: future },
      status: { in: ['pending', 'confirmed'] },
    };
    if (userId) where.createdById = userId;

    const items = await prisma.appointment.findMany({
      where,
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      take: 20,
    });

    res.json({ success: true, data: items.map(mapAppointment) });
  } catch (err) { next(err); }
});

router.get('/customer/:customerId', requireAuth, async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const items = await prisma.appointment.findMany({
      where: { customerId },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });
    res.json({ success: true, data: items.map(mapAppointment) });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.appointment.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
    if (!item) return res.status(404).json({ success: false, error: 'Tapılmadı' });
    res.json({ success: true, data: mapAppointment(item) });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const data = {
      title: body.title,
      customerId: body.customer_id ? parseInt(body.customer_id) : null,
      customerName: body.customer_name ?? null,
      phone: body.phone ?? null,
      date: body.date,
      time: body.time ?? '09:00',
      duration: parseInt(body.duration) || 60,
      status: body.status || 'pending',
      notes: body.notes ?? null,
      createdById: req.user.id,
    };

    if (!data.title || !data.date) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const created = await prisma.appointment.create({ data });
    res.json({ success: true, data: mapAppointment(created) });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};
    const data = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.customer_id !== undefined) data.customerId = body.customer_id ? parseInt(body.customer_id) : null;
    if (body.customer_name !== undefined) data.customerName = body.customer_name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.date !== undefined) data.date = body.date;
    if (body.time !== undefined) data.time = body.time;
    if (body.duration !== undefined) data.duration = parseInt(body.duration);
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;

    const updated = await prisma.appointment.update({ where: { id }, data });
    res.json({ success: true, data: mapAppointment(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.appointment.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
