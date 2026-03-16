const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { limit, offset, orderBy, orderDir, userId, startDate, endDate, search, paymentStatus, payment_status, brand, customer_id, customerId, vehicle_id, vehicleId } = req.query;
    
    const where = {};
    if (userId) where.createdById = parseInt(userId);
    const cid = customer_id || customerId;
    if (cid) where.customerId = parseInt(cid);
    const vid = vehicle_id || vehicleId;
    if (vid) where.vehicleId = parseInt(vid);
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }
    const ps = paymentStatus || payment_status;
    if (ps) {
      where.paymentStatus = ps;
    }
    if (brand) {
      where.carBrand = { contains: brand, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { carPlate: { contains: search, mode: 'insensitive' } },
        { serviceType: { contains: search, mode: 'insensitive' } }
      ];
    }

    const records = await prisma.record.findMany({
      where,
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0,
      orderBy: { [orderBy || 'date']: orderDir || 'desc' },
      include: {
        customer: true,
        vehicle: true
      }
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
      paid_amount: r.paidAmount,
      remaining_amount: r.remainingAmount,
      payment_status: r.paymentStatus,
      created_by_id: r.createdById,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.get('/unpaid', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query;
    const where = {
      remainingAmount: { gt: 0 },
      paymentStatus: { in: ['gozleyir', 'qismen', 'borc'] },
    };
    if (userId) where.createdById = parseInt(userId);

    const records = await prisma.record.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: { customer: true, vehicle: true },
      take: 500,
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
      paid_amount: r.paidAmount,
      remaining_amount: r.remainingAmount,
      payment_status: r.paymentStatus,
      created_by_id: r.createdById,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const record = await prisma.record.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { customer: true, vehicle: true }
    });
    if (!record) return res.status(404).json({ success: false, error: 'Qeyd tapılmadı' });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};

    const data = {
      date: body.date || new Date().toISOString().split('T')[0],
      time: body.time ?? undefined,
      customerId: body.customer_id ?? body.customerId ?? undefined,
      customerName: body.customer_name ?? body.customerName ?? undefined,
      customerPhone: body.customer_phone ?? body.customerPhone ?? undefined,
      vehicleId: body.vehicle_id ?? body.vehicleId ?? undefined,
      carBrand: body.car_brand ?? body.carBrand ?? undefined,
      carModel: body.car_model ?? body.carModel ?? undefined,
      carPlate: body.car_plate ?? body.carPlate ?? undefined,
      serviceType: body.service_type ?? body.serviceType ?? undefined,
      extraServices: body.extra_services ?? body.extraServices ?? undefined,
      quantity: body.quantity === undefined ? undefined : Number(body.quantity),
      unitPrice: body.unit_price === undefined ? undefined : (body.unit_price === null ? null : Number(body.unit_price)),
      totalPrice: body.total_price === undefined ? undefined : (body.total_price === null ? null : Number(body.total_price)),
      paymentStatus: body.payment_status ?? body.paymentStatus ?? undefined,
      paidAmount: body.paid_amount === undefined ? undefined : Number(body.paid_amount),
      remainingAmount: body.remaining_amount === undefined ? undefined : Number(body.remaining_amount),
      notes: body.notes ?? undefined,
      rawInput: body.raw_input ?? body.rawInput ?? undefined,
      createdById: req.user.id,
    };

    const record = await prisma.record.create({
      data,
      include: { customer: true, vehicle: true },
    });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const data = {
      date: body.date,
      time: body.time ?? undefined,
      customerName: body.customer_name ?? body.customerName ?? undefined,
      customerPhone: body.customer_phone ?? body.customerPhone ?? undefined,
      carBrand: body.car_brand ?? body.carBrand ?? undefined,
      carModel: body.car_model ?? body.carModel ?? undefined,
      carPlate: body.car_plate ?? body.carPlate ?? undefined,
      serviceType: body.service_type ?? body.serviceType ?? undefined,
      extraServices: body.extra_services ?? body.extraServices ?? undefined,
      quantity: body.quantity === undefined ? undefined : Number(body.quantity),
      unitPrice: body.unit_price === undefined ? undefined : (body.unit_price === null ? null : Number(body.unit_price)),
      totalPrice: body.total_price === undefined ? undefined : (body.total_price === null ? null : Number(body.total_price)),
      paymentStatus: body.payment_status ?? body.paymentStatus ?? undefined,
      paidAmount: body.paid_amount === undefined ? undefined : Number(body.paid_amount),
      remainingAmount: body.remaining_amount === undefined ? undefined : Number(body.remaining_amount),
      notes: body.notes ?? undefined,
    };

    const record = await prisma.record.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.record.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/bulk-delete', requireAuth, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ success: false, error: 'validation_error' });
    const intIds = ids.map(x => parseInt(x)).filter(Boolean);
    const result = await prisma.record.deleteMany({ where: { id: { in: intIds } } });
    res.json({ success: true, data: { deleted: result.count } });
  } catch (err) { next(err); }
});

module.exports = router;
