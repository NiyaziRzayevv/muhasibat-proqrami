const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapNotif(n) {
  return {
    ...n,
    is_read: n.isRead,
    user_id: n.userId,
    created_at: n.createdAt,
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

router.post('/check', requireAuth, async (req, res, next) => {
  try {
    const userId = req.body?.user_id ? parseInt(req.body.user_id) : req.user.id;
    const since = startOfToday();

    const existing = await prisma.notification.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map(x => x.type));

    const created = [];

    if (!existingTypes.has('low_stock')) {
      const low = await prisma.product.findMany({
        where: { createdById: userId },
        select: { id: true, name: true, stockQty: true, minStock: true, unit: true },
      });
      const lowList = low.filter(p => (p.stockQty || 0) <= (p.minStock || 0));
      if (lowList.length > 0) {
        const n = await prisma.notification.create({
          data: {
            type: 'low_stock',
            title: 'Aşağı stok məhsullar',
            message: `${lowList.length} məhsul aşağı stok səviyyəsindədir`,
            data: { items: lowList.slice(0, 20).map(p => ({ id: p.id, name: p.name, stock_qty: p.stockQty, min_stock: p.minStock, unit: p.unit })) },
            userId,
          }
        });
        created.push(mapNotif(n));
      }
    }

    if (!existingTypes.has('unpaid_debts')) {
      const [records, sales] = await Promise.all([
        prisma.record.findMany({ where: { createdById: userId }, select: { totalPrice: true, paidAmount: true } }),
        prisma.sale.findMany({ where: { createdById: userId }, select: { total: true, paidAmount: true } }),
      ]);

      const recordDebt = records.reduce((s, r) => s + Math.max(0, (r.totalPrice || 0) - (r.paidAmount || 0)), 0);
      const saleDebt = sales.reduce((s, r) => s + Math.max(0, (r.total || 0) - (r.paidAmount || 0)), 0);
      const totalDebt = recordDebt + saleDebt;

      if (totalDebt > 0) {
        const n = await prisma.notification.create({
          data: {
            type: 'unpaid_debts',
            title: 'Ödənilməmiş borclar',
            message: `Cəmi borc: ${Number(totalDebt).toFixed(2)} ₼`,
            data: { record_debt: recordDebt, sale_debt: saleDebt, total_debt: totalDebt },
            userId,
          }
        });
        created.push(mapNotif(n));
      }
    }

    if (!existingTypes.has('upcoming_appointments')) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const upcomingCount = await prisma.appointment.count({
        where: { date: { gte: today, lte: tomorrow }, status: { in: ['pending', 'confirmed'] } },
      });
      if (upcomingCount > 0) {
        const n = await prisma.notification.create({
          data: {
            type: 'upcoming_appointments',
            title: 'Yaxın Randevular',
            message: `${upcomingCount} randevu bu gün/sabah üçün planlaşdırılıb`,
            data: { count: upcomingCount },
            userId,
          }
        });
        created.push(mapNotif(n));
      }
    }

    if (!existingTypes.has('overdue_tasks')) {
      const today = new Date().toISOString().split('T')[0];
      const overdueCount = await prisma.task.count({
        where: { status: { not: 'done' }, dueDate: { not: null, lt: today } },
      });
      if (overdueCount > 0) {
        const n = await prisma.notification.create({
          data: {
            type: 'overdue_tasks',
            title: 'Gecikmiş Tapşırıqlar',
            message: `${overdueCount} tapşırığın son tarixi keçib`,
            data: { count: overdueCount },
            userId,
          }
        });
        created.push(mapNotif(n));
      }
    }

    res.json({ success: true, data: { created } });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;

    const list = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: list.map(mapNotif) });
  } catch (err) { next(err); }
});

router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, data: mapNotif(updated) });
  } catch (err) { next(err); }
});

router.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.body?.user_id ? parseInt(req.body.user_id) : req.user.id;
    const result = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    res.json({ success: true, data: { updated: result.count } });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
