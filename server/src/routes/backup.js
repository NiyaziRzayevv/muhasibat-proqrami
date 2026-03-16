const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

router.get('/export', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [
      settings,
      categories,
      suppliers,
      products,
      customers,
      vehicles,
      records,
      sales,
      saleItems,
      stockMovements,
      licenses,
    ] = await Promise.all([
      prisma.setting.findMany(),
      prisma.category.findMany(),
      prisma.supplier.findMany(),
      prisma.product.findMany(),
      prisma.customer.findMany(),
      prisma.vehicle.findMany(),
      prisma.record.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.stockMovement.findMany(),
      prisma.license.findMany(),
    ]);

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        version: 1,
        settings,
        categories,
        suppliers,
        products,
        customers,
        vehicles,
        records,
        sales,
        saleItems,
        stockMovements,
        licenses,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
