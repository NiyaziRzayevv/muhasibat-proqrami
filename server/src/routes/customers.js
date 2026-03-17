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

router.get('/:id/records', requireAuth, async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);
    const records = await prisma.record.findMany({
      where: { customerId },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
    const mapped = records.map(r => ({
      ...r,
      customer_id: r.customerId,
      vehicle_id: r.vehicleId,
      car_brand: r.carBrand,
      car_model: r.carModel,
      car_plate: r.carPlate,
      customer_name: r.customerName,
      service_type: r.serviceType,
      total_price: r.totalPrice,
      unit_price: r.unitPrice,
      paid_amount: r.paidAmount,
      remaining_amount: r.remainingAmount,
      payment_status: r.paymentStatus,
      created_by_id: r.createdById,
    }));
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.get('/:id/history', requireAuth, async (req, res, next) => {
  try {
    const customerId = parseInt(req.params.id);

    const [records, sales, appointments] = await Promise.all([
      prisma.record.findMany({
        where: { customerId },
        orderBy: { date: 'desc' },
      }),
      prisma.sale.findMany({
        where: { customerId },
        include: { items: true },
        orderBy: { date: 'desc' },
      }),
      prisma.appointment.findMany({
        where: { customerId },
        orderBy: { date: 'desc' },
      }),
    ]);

    const timeline = [
      ...records.map(r => ({
        type: 'record',
        id: r.id,
        date: r.date,
        time: r.time,
        description: r.serviceType || 'Servis',
        amount: r.totalPrice || 0,
        paid: r.paidAmount || 0,
        remaining: r.remainingAmount || 0,
        status: r.paymentStatus,
      })),
      ...sales.map(s => ({
        type: 'sale',
        id: s.id,
        date: s.date,
        time: s.time,
        description: (s.items || []).map(i => i.productName).filter(Boolean).join(', ') || 'Satış',
        amount: s.total || 0,
        paid: s.paidAmount || 0,
        remaining: Math.max(0, (s.total || 0) - (s.paidAmount || 0)),
        status: s.paymentStatus,
        item_count: (s.items || []).length,
      })),
      ...appointments.map(a => ({
        type: 'appointment',
        id: a.id,
        date: a.date,
        time: a.time,
        description: a.title || 'Randevu',
        status: a.status,
      })),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const totalSpent = records.reduce((s, r) => s + (r.totalPrice || 0), 0) + sales.reduce((s, r) => s + (r.total || 0), 0);
    const totalPaid = records.reduce((s, r) => s + (r.paidAmount || 0), 0) + sales.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const totalDebt = totalSpent - totalPaid;

    res.json({
      success: true,
      data: {
        timeline,
        summary: {
          total_visits: records.length + sales.length,
          total_spent: totalSpent,
          total_paid: totalPaid,
          total_debt: totalDebt,
          appointment_count: appointments.length,
        },
      },
    });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.customer.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
