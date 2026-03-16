const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapSale(sale) {
  if (!sale) return sale;
  return {
    ...sale,
    customer_id: sale.customerId,
    customer_name: sale.customerName,
    payment_status: sale.paymentStatus,
    paid_amount: sale.paidAmount,
    payment_method: sale.paymentMethod,
    created_by_id: sale.createdById,
    created_at: sale.createdAt,
    item_count: sale.items ? sale.items.length : sale.item_count,
    items: Array.isArray(sale.items) ? sale.items.map(it => ({
      ...it,
      sale_id: it.saleId,
      product_id: it.productId,
      product_name: it.productName,
      unit_price: it.unitPrice,
    })) : undefined,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const {
      startDate, endDate, dateFrom, dateTo,
      search,
      payment_status, paymentStatus,
      payment_method, paymentMethod,
      customer_id, customerId,
      userId,
      limit, offset,
    } = req.query;

    const where = {};
    const sd = startDate || dateFrom;
    const ed = endDate || dateTo;
    if (sd && ed) where.date = { gte: sd, lte: ed };
    if (userId) where.createdById = parseInt(userId);

    const ps = payment_status || paymentStatus;
    if (ps) where.paymentStatus = ps;

    const pm = payment_method || paymentMethod;
    if (pm) where.paymentMethod = pm;

    const cid = customer_id || customerId;
    if (cid) where.customerId = parseInt(cid);

    if (search) {
      where.customerName = { contains: search, mode: 'insensitive' };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { items: true },
      take: limit ? parseInt(limit) : 200,
      skip: offset ? parseInt(offset) : 0,
      orderBy: [{ date: 'desc' }, { time: 'desc' }, { id: 'desc' }],
    });

    res.json({ success: true, data: sales.map(mapSale) });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!sale) return res.status(404).json({ success: false, error: 'Satış tapılmadı' });

    const mapped = mapSale({
      ...sale,
      items: (sale.items || []).map(it => ({
        ...it,
        unit: it.product?.unit || null,
        stock_qty: it.product?.stockQty ?? null,
      }))
    });

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const date = body.date || new Date().toISOString().split('T')[0];
    const time = body.time ?? null;
    const customerName = body.customer_name ?? body.customerName ?? null;
    const customerId = body.customer_id ?? body.customerId ?? null;
    const discount = Number(body.discount || 0);
    const paymentMethod = body.payment_method ?? body.paymentMethod ?? 'cash';
    const notes = body.notes ?? null;

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ success: false, error: 'validation_error' });

    const normalizedItems = items.map(it => ({
      productId: it.product_id ?? it.productId ?? null,
      productName: it.product_name ?? it.productName ?? null,
      qty: Number(it.qty ?? it.quantity ?? 0),
      unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
    }));

    if (normalizedItems.some(it => !Number.isFinite(it.qty) || it.qty <= 0)) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const subtotal = normalizedItems.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
    const total = Math.max(0, subtotal - discount);

    const paidAmount = body.paid_amount === undefined
      ? total
      : Number(body.paid_amount);

    const paymentStatus = body.payment_status ?? body.paymentStatus ?? ((paidAmount >= total) ? 'odenilib' : 'gozleyir');

    const created = await prisma.$transaction(async (tx) => {
      for (const it of normalizedItems) {
        if (!it.productId) continue;
        const p = await tx.product.findUnique({ where: { id: parseInt(it.productId) } });
        if (!p) throw new Error('Məhsul tapılmadı');
        const before = p.stockQty || 0;
        const after = before - Math.abs(it.qty);
        if (after < 0) throw new Error('Stok kifayət etmir');
        await tx.product.update({ where: { id: p.id }, data: { stockQty: after } });
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            movementType: 'satis',
            qty: -Math.abs(it.qty),
            qtyBefore: before,
            qtyAfter: after,
            note: 'Satış',
            createdById: req.user.id,
          }
        });
      }

      const sale = await tx.sale.create({
        data: {
          date,
          time,
          customerName,
          customerId: customerId ? parseInt(customerId) : null,
          subtotal,
          discount,
          total,
          paymentStatus,
          paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
          paymentMethod,
          notes,
          createdById: req.user.id,
          items: {
            create: normalizedItems.map(it => ({
              productId: it.productId ? parseInt(it.productId) : null,
              productName: it.productName,
              qty: it.qty,
              unitPrice: it.unitPrice,
              total: it.qty * it.unitPrice,
            }))
          }
        },
        include: { items: true },
      });

      return sale;
    });

    res.json({ success: true, data: mapSale(created) });
  } catch (err) { next(err); }
});

router.put('/:id/payment', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};

    const paidAmount = body.paid_amount === undefined ? undefined : Number(body.paid_amount);
    const paymentStatus = body.payment_status ?? body.paymentStatus ?? undefined;

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        paidAmount: paidAmount === undefined ? undefined : paidAmount,
        paymentStatus,
      },
      include: { items: true },
    });

    res.json({ success: true, data: mapSale(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!sale) return;

      for (const it of (sale.items || [])) {
        if (!it.productId) continue;
        const p = await tx.product.findUnique({ where: { id: it.productId } });
        if (!p) continue;
        const before = p.stockQty || 0;
        const after = before + Math.abs(it.qty || 0);
        await tx.product.update({ where: { id: p.id }, data: { stockQty: after } });
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            movementType: 'iade',
            qty: Math.abs(it.qty || 0),
            qtyBefore: before,
            qtyAfter: after,
            note: `Satış #${id} silindi`,
            createdById: req.user.id,
            refType: 'sale_delete',
            refId: id,
          }
        });
      }

      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
