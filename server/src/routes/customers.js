const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    created_by_id: c.createdById,
    visit_count: c.visit_count ?? 0,
    total_spent: c.total_spent ?? 0,
    debt: c.debt ?? 0,
    last_visit: c.last_visit ?? null,
    vehicles: c.vehicles,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, userId } = req.query;
    
    const where = {};
    if (userId) where.createdById = parseInt(userId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        vehicles: true,
        records: { select: { date: true, totalPrice: true, paidAmount: true } },
        sales: { select: { date: true, total: true, paidAmount: true } },
      },
      orderBy: { name: 'asc' }
    });

    const mapped = customers.map(c => {
      const records = Array.isArray(c.records) ? c.records : [];
      const sales = Array.isArray(c.sales) ? c.sales : [];
      const visit_count = records.length + sales.length;
      const total_spent = records.reduce((s, r) => s + (r.totalPrice || 0), 0) + sales.reduce((s, r) => s + (r.total || 0), 0);
      const debt = records.reduce((s, r) => s + Math.max(0, (r.totalPrice || 0) - (r.paidAmount || 0)), 0) + sales.reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.paidAmount || 0)), 0);
      const last_visit = [...records.map(r => r.date).filter(Boolean), ...sales.map(r => r.date).filter(Boolean)].sort().slice(-1)[0] || null;

      return mapCustomer({ ...c, visit_count, total_spent, debt, last_visit });
    });

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicles: true, records: true, sales: true }
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Müştəri tapılmadı' });
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const customer = await prisma.customer.create({
      data: {
        name: body.name ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        createdById: req.user.id,
      },
      include: { vehicles: true, records: true, sales: true }
    });

    res.json({ success: true, data: mapCustomer({
      ...customer,
      visit_count: (customer.records?.length || 0) + (customer.sales?.length || 0),
      total_spent: (customer.records || []).reduce((s, r) => s + (r.totalPrice || 0), 0) + (customer.sales || []).reduce((s, r) => s + (r.total || 0), 0),
      debt: (customer.records || []).reduce((s, r) => s + Math.max(0, (r.totalPrice || 0) - (r.paidAmount || 0)), 0) + (customer.sales || []).reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.paidAmount || 0)), 0),
      last_visit: [...(customer.records || []).map(r => r.date).filter(Boolean), ...(customer.sales || []).map(r => r.date).filter(Boolean)].sort().slice(-1)[0] || null,
    }) });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        notes: body.notes ?? undefined,
      },
      include: {
        vehicles: true,
        records: { select: { date: true, totalPrice: true, paidAmount: true } },
        sales: { select: { date: true, total: true, paidAmount: true } },
      },
    });

    const visit_count = (customer.records?.length || 0) + (customer.sales?.length || 0);
    const total_spent = (customer.records || []).reduce((s, r) => s + (r.totalPrice || 0), 0) + (customer.sales || []).reduce((s, r) => s + (r.total || 0), 0);
    const debt = (customer.records || []).reduce((s, r) => s + Math.max(0, (r.totalPrice || 0) - (r.paidAmount || 0)), 0) + (customer.sales || []).reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.paidAmount || 0)), 0);
    const last_visit = [...(customer.records || []).map(r => r.date).filter(Boolean), ...(customer.sales || []).map(r => r.date).filter(Boolean)].sort().slice(-1)[0] || null;

    res.json({ success: true, data: mapCustomer({ ...customer, visit_count, total_spent, debt, last_visit }) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.customer.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
