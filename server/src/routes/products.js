const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { userId, search, category_id, low_stock } = req.query;
    const where = {};
    if (userId) where.createdById = parseInt(userId);
    if (category_id) where.categoryId = parseInt(category_id);
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    let products = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' }
    });

    if (String(low_stock) === 'true') {
      products = products.filter(p => (p.stockQty || 0) <= (p.minStock || 0));
    }

    const mapped = products.map(p => ({
      id: p.id,
      name: p.name,
      category_id: p.categoryId,
      category_name: p.category?.name || null,
      supplier_id: p.supplierId,
      supplier_name: p.supplier?.name || null,
      sku: p.sku,
      unit: p.unit,
      buy_price: p.buyPrice,
      sell_price: p.sellPrice,
      stock_qty: p.stockQty,
      min_stock: p.minStock,
      barcode: p.barcode,
      notes: p.notes,
      created_by_id: p.createdById,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, unit, buy_price, sell_price, stock_qty, min_stock, category_id, barcode, sku, supplier_id, notes } = req.body;
    const product = await prisma.product.create({
      data: {
        name,
        unit: unit || 'ədəd',
        buyPrice: buy_price || 0,
        sellPrice: sell_price || 0,
        stockQty: stock_qty || 0,
        minStock: min_stock || 0,
        categoryId: category_id || null,
        barcode: barcode || null,
        sku: sku || null,
        supplierId: supplier_id || null,
        notes: notes || null,
        createdById: req.user.id,
      }
    });
    res.json({ success: true, data: {
      id: product.id,
      name: product.name,
      category_id: product.categoryId,
      supplier_id: product.supplierId,
      sku: product.sku,
      unit: product.unit,
      buy_price: product.buyPrice,
      sell_price: product.sellPrice,
      stock_qty: product.stockQty,
      min_stock: product.minStock,
      barcode: product.barcode,
      notes: product.notes,
      created_by_id: product.createdById,
    }});
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, unit, buy_price, sell_price, stock_qty, min_stock, category_id, barcode, sku, supplier_id, notes } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        unit: unit || undefined,
        buyPrice: buy_price === undefined ? undefined : buy_price,
        sellPrice: sell_price === undefined ? undefined : sell_price,
        stockQty: stock_qty === undefined ? undefined : stock_qty,
        minStock: min_stock === undefined ? undefined : min_stock,
        categoryId: category_id === undefined ? undefined : category_id,
        barcode: barcode === undefined ? undefined : barcode,
        sku: sku === undefined ? undefined : (sku || null),
        supplierId: supplier_id === undefined ? undefined : (supplier_id || null),
        notes: notes === undefined ? undefined : (notes || null),
      }
    });
    res.json({ success: true, data: {
      id: product.id,
      name: product.name,
      category_id: product.categoryId,
      supplier_id: product.supplierId,
      sku: product.sku,
      unit: product.unit,
      buy_price: product.buyPrice,
      sell_price: product.sellPrice,
      stock_qty: product.stockQty,
      min_stock: product.minStock,
      barcode: product.barcode,
      notes: product.notes,
      created_by_id: product.createdById,
    }});
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : (req.body?.rows || []);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'validation_error' });
    }

    let created = 0;
    for (const r of rows) {
      const name = r.name || r.Ad || r.ad;
      if (!name) continue;
      await prisma.product.create({
        data: {
          name: String(name).trim(),
          unit: (r.unit || r.Vahid || 'ədəd'),
          buyPrice: parseFloat(r.buy_price ?? r['Alig Qiymeti'] ?? r.buyPrice ?? 0) || 0,
          sellPrice: parseFloat(r.sell_price ?? r['Satis Qiymeti'] ?? r.sellPrice ?? 0) || 0,
          stockQty: parseFloat(r.stock_qty ?? r.Stok ?? 0) || 0,
          minStock: parseFloat(r.min_stock ?? r['Min Stok'] ?? 0) || 0,
          barcode: r.barcode || r.Barkod || null,
          sku: r.sku || r.SKU || null,
          createdById: req.user.id,
        }
      });
      created++;
    }

    res.json({ success: true, data: { created } });
  } catch (err) { next(err); }
});

module.exports = router;
