const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapTask(t) {
  if (!t) return t;
  return {
    ...t,
    due_date: t.dueDate,
    assigned_to: t.assignedTo,
    created_by: t.createdById,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, status, priority, userId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (userId) where.createdById = parseInt(userId);

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    res.json({ success: true, data: items.map(mapTask) });
  } catch (err) { next(err); }
});

router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const where = { status: { not: 'done' } };
    if (userId) where.createdById = userId;

    const items = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
    });

    res.json({ success: true, data: items.map(mapTask) });
  } catch (err) { next(err); }
});

router.get('/overdue', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const today = new Date().toISOString().split('T')[0];
    const where = {
      status: { not: 'done' },
      dueDate: { not: null, lt: today },
    };
    if (userId) where.createdById = userId;

    const items = await prisma.task.findMany({ where, orderBy: { dueDate: 'asc' } });
    res.json({ success: true, data: items.map(mapTask) });
  } catch (err) { next(err); }
});

router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const today = new Date().toISOString().split('T')[0];
    const base = userId ? { createdById: userId } : {};

    const [todo, inProgress, done, overdue] = await Promise.all([
      prisma.task.count({ where: { ...base, status: 'todo' } }),
      prisma.task.count({ where: { ...base, status: 'in_progress' } }),
      prisma.task.count({ where: { ...base, status: 'done' } }),
      prisma.task.count({ where: { ...base, status: { not: 'done' }, dueDate: { not: null, lt: today } } }),
    ]);

    res.json({ success: true, data: { todo, in_progress: inProgress, done, overdue, total: todo + inProgress + done } });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = await prisma.task.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: 'Tapılmadı' });
    res.json({ success: true, data: mapTask(item) });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const data = {
      title: body.title,
      description: body.description ?? null,
      priority: body.priority || 'medium',
      status: body.status || 'todo',
      dueDate: body.due_date ?? null,
      assignedTo: body.assigned_to ?? null,
      createdById: req.user.id,
    };

    if (!data.title) return res.status(400).json({ success: false, error: 'validation_error' });

    const created = await prisma.task.create({ data });
    res.json({ success: true, data: mapTask(created) });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};
    const data = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.status !== undefined) data.status = body.status;
    if (body.due_date !== undefined) data.dueDate = body.due_date;
    if (body.assigned_to !== undefined) data.assignedTo = body.assigned_to;

    const updated = await prisma.task.update({ where: { id }, data });
    res.json({ success: true, data: mapTask(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
