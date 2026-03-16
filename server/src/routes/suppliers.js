const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, userId } = req.query;
    const where = {};
    if (userId) where.createdById = parseInt(userId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    const mapped = rows.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      notes: s.notes,
      product_count: s._count?.products || 0,
      created_by_id: s.createdById,
    }));
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'validation_error' });
    const row = await prisma.supplier.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
        createdById: req.user.id,
      }
    });
    res.json({ success: true, data: { id: row.id, name: row.name } });
  } catch (err) { next(err); }
});

router.get('/:id/products', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const products = await prisma.product.findMany({
      where: { supplierId: id },
      orderBy: { name: 'asc' },
    });

    const mapped = products.map(p => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      stock_qty: p.stockQty,
      sell_price: p.sellPrice,
      buy_price: p.buyPrice,
      sku: p.sku,
      barcode: p.barcode,
      notes: p.notes,
      supplier_id: p.supplierId,
      category_id: p.categoryId,
      min_stock: p.minStock,
      created_by_id: p.createdById,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};
    const row = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        email: body.email ?? undefined,
        address: body.address ?? undefined,
        notes: body.notes ?? undefined,
      }
    });
    res.json({ success: true, data: { id: row.id, name: row.name } });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.supplier.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
