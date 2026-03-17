const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

async function applyStockMovement({ productId, qty, movementType, note, createdById }) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Məhsul tapılmadı');

  const before = product.stockQty || 0;
  const absQty = Math.abs(qty || 0);
  const delta = movementType === 'giris' ? absQty : -absQty;
  const after = before + delta;
  if (after < 0) throw new Error('Stok kifayət etmir');

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: { stockQty: after },
    });

    await tx.stockMovement.create({
      data: {
        productId,
        movementType,
        qty: delta,
        qtyBefore: before,
        qtyAfter: after,
        note: note || null,
        createdById: createdById || null,
      }
    });

    return updated;
  });

  return { before, after, product: result };
}

router.get('/movements', requireAuth, async (req, res, next) => {
  try {
    const { movement_type, startDate, endDate, userId, limit, offset } = req.query;

    const where = {};
    if (movement_type) where.movementType = String(movement_type);
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }
    if (userId) {
      where.product = { is: { createdById: parseInt(userId) } };
    }

    const rows = await prisma.stockMovement.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 500,
      skip: offset ? parseInt(offset) : 0,
    });

    const mapped = rows.map(m => ({
      id: m.id,
      product_id: m.productId,
      product_name: m.product?.name || null,
      unit: m.product?.unit || null,
      movement_type: m.movementType,
      qty: m.qty,
      qty_before: m.qtyBefore,
      qty_after: m.qtyAfter,
      note: m.note,
      created_at: m.createdAt,
      created_by_id: m.createdById,
      ref_type: m.refType,
      ref_id: m.refId,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.post('/in', requireAuth, async (req, res, next) => {
  try {
    const { product_id, qty, note } = req.body || {};
    const productId = parseInt(product_id);
    const q = parseFloat(qty);
    if (!productId || !Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const r = await applyStockMovement({
      productId,
      qty: q,
      movementType: 'giris',
      note,
      createdById: req.user.id,
    });

    res.json({ success: true, data: { qty_before: r.before, qty_after: r.after, stock_qty: r.after } });
  } catch (err) { next(err); }
});

router.post('/out', requireAuth, async (req, res, next) => {
  try {
    const { product_id, qty, note } = req.body || {};
    const productId = parseInt(product_id);
    const q = parseFloat(qty);
    if (!productId || !Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const r = await applyStockMovement({
      productId,
      qty: q,
      movementType: 'cixis',
      note,
      createdById: req.user.id,
    });

    res.json({ success: true, data: { qty_before: r.before, qty_after: r.after, stock_qty: r.after } });
  } catch (err) { next(err); }
});

// Stock Adjust — set to exact quantity
router.post('/adjust', requireAuth, async (req, res, next) => {
  try {
    const { product_id, productId, new_quantity, newQuantity, note } = req.body || {};
    const pid = parseInt(product_id || productId);
    const newQty = parseFloat(new_quantity ?? newQuantity);
    if (!pid || !Number.isFinite(newQty) || newQty < 0) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product) return res.status(404).json({ success: false, error: 'Məhsul tapılmadı' });

    const before = product.stockQty || 0;
    const delta = newQty - before;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: pid },
        data: { stockQty: newQty },
      });

      await tx.stockMovement.create({
        data: {
          productId: pid,
          movementType: 'duzelis',
          qty: delta,
          qtyBefore: before,
          qtyAfter: newQty,
          note: note || 'Manual düzəliş',
          createdById: req.user.id,
        }
      });

      return updated;
    });

    res.json({ success: true, data: { qty_before: before, qty_after: newQty, stock_qty: newQty } });
  } catch (err) { next(err); }
});

// Stock Stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const where = {};
    if (userId) where.product = { is: { createdById: userId } };

    const movements = await prisma.stockMovement.findMany({ where, include: { product: true } });

    const inQty = movements.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
    const outQty = movements.filter(m => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0);

    res.json({
      success: true,
      data: {
        total_movements: movements.length,
        total_in: inQty,
        total_out: outQty,
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
