const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const statsService = require('../services/stats-service');
const { prisma } = require('../prisma');

const router = Router();

router.get('/today', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getTodayStats(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/month/:year/:month', requireAuth, async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getMonthStats(parseInt(year), parseInt(month), userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/all-time', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getAllTimeStats(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/top-services', requireAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 8;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getTopServices(limit, userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/top-brands', requireAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 8;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getTopBrands(limit, userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/monthly-chart/:year', requireAuth, async (req, res, next) => {
  try {
    const { year } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getMonthlyChart(parseInt(year), userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/customers/count', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const count = await statsService.getCustomerCount(userId);
    res.json({ success: true, data: count });
  } catch (err) { next(err); }
});

router.get('/low-stock', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getLowStockProducts(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/stock-value', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getStockValue(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/sales', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getSalesStats(startDate, endDate, userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/monthly-revenue/:year', requireAuth, async (req, res, next) => {
  try {
    const { year } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getMonthlyRevenue(parseInt(year), userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/yearly-revenue', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getYearlyRevenue(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/debt', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getDebtStats(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/products', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getProductStats(userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/expenses', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const data = await statsService.getExpenseStats(startDate, endDate, userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/top-selling-products', requireAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    const items = await prisma.saleItem.findMany({
      where: userId ? { sale: { createdById: userId } } : undefined,
      include: { product: true },
    });

    const map = new Map();
    for (const it of items) {
      const key = it.productId ? `p:${it.productId}` : `n:${it.productName || ''}`;
      const prev = map.get(key) || {
        product_id: it.productId,
        product_name: it.productName,
        total_qty: 0,
        total_revenue: 0,
        unit: it.product?.unit || null,
        stock_qty: it.product?.stockQty ?? null,
      };
      prev.total_qty += Number(it.qty || 0);
      prev.total_revenue += Number(it.total || 0);
      if (!prev.unit && it.product?.unit) prev.unit = it.product.unit;
      if (prev.stock_qty === null || prev.stock_qty === undefined) {
        if (it.product?.stockQty !== undefined) prev.stock_qty = it.product.stockQty;
      }
      map.set(key, prev);
    }

    const data = Array.from(map.values())
      .sort((a, b) => (b.total_qty || 0) - (a.total_qty || 0))
      .slice(0, Math.max(0, limit));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/monthly-sales-chart/:year', requireAuth, async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const where = { date: { gte: start, lte: end } };
    if (userId) where.createdById = userId;

    const sales = await prisma.sale.findMany({
      where,
      select: { date: true, total: true },
    });

    const buckets = {};
    for (const s of sales) {
      const m = String(s.date || '').slice(5, 7);
      if (!m) continue;
      if (!buckets[m]) buckets[m] = { month: Number(m), total: 0, count: 0 };
      buckets[m].total += Number(s.total || 0);
      buckets[m].count += 1;
    }

    const data = Object.values(buckets).sort((a, b) => a.month - b.month);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/notifications/unread', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const count = await statsService.getUnreadNotificationCount(userId);
    res.json({ success: true, data: count });
  } catch (err) { next(err); }
});

module.exports = router;
