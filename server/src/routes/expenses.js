const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapExpense(e) {
  return {
    ...e,
    payment_method: e.paymentMethod,
    user_id: e.userId,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: e.deletedAt,
    sync_status: e.syncStatus,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate, category, search, userId } = req.query;

    const where = { deletedAt: null };
    if (userId) where.userId = parseInt(userId);

    if (startDate && endDate) where.date = { gte: startDate, lte: endDate };
    if (category) where.category = category;

    if (search) {
      where.OR = [
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: items.map(mapExpense) });
  } catch (err) { next(err); }
});

router.get('/categories', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query;
    const where = { deletedAt: null };
    if (userId) where.userId = parseInt(userId);

    const rows = await prisma.expense.findMany({
      where,
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    const cats = rows.map(r => r.category).filter(Boolean);
    res.json({ success: true, data: cats });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};

    const data = {
      date: body.date || new Date().toISOString().split('T')[0],
      category: body.category || 'Digər',
      description: body.description ?? null,
      amount: Number(body.amount || 0),
      paymentMethod: body.payment_method ?? body.paymentMethod ?? 'cash',
      reference: body.reference ?? null,
      userId: body.user_id ? parseInt(body.user_id) : req.user.id,
      notes: body.notes ?? null,
      syncStatus: body.sync_status ?? body.syncStatus ?? 'local',
    };

    const created = await prisma.expense.create({ data });
    res.json({ success: true, data: mapExpense(created) });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};

    const data = {
      date: body.date ?? undefined,
      category: body.category ?? undefined,
      description: body.description ?? undefined,
      amount: body.amount === undefined ? undefined : Number(body.amount || 0),
      paymentMethod: body.payment_method ?? body.paymentMethod ?? undefined,
      reference: body.reference ?? undefined,
      notes: body.notes ?? undefined,
    };

    const updated = await prisma.expense.update({ where: { id }, data });
    res.json({ success: true, data: mapExpense(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
