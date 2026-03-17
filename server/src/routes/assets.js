const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

function mapAsset(a) {
  if (!a) return a;
  return {
    ...a,
    serial_number: a.serialNumber,
    purchase_date: a.purchaseDate,
    purchase_price: a.purchasePrice,
    current_value: a.currentValue,
    created_by_id: a.createdById,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt,
  };
}

// GET all assets
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, status, category, userId } = req.query;
    const where = { deletedAt: null };
    if (userId) where.createdById = parseInt(userId);
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: rows.map(mapAsset) });
  } catch (err) { next(err); }
});

// GET single asset
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const row = await prisma.asset.findUnique({ where: { id } });
    if (!row || row.deletedAt) return res.status(404).json({ success: false, error: 'Aktiv tapılmadı' });
    res.json({ success: true, data: mapAsset(row) });
  } catch (err) { next(err); }
});

// CREATE asset
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, error: 'Ad tələb olunur' });

    const row = await prisma.asset.create({
      data: {
        name: b.name,
        category: b.category || 'Avadanlıq',
        serialNumber: b.serial_number || b.serialNumber || null,
        purchaseDate: b.purchase_date || b.purchaseDate || null,
        purchasePrice: b.purchase_price !== undefined ? Number(b.purchase_price) : (b.purchasePrice !== undefined ? Number(b.purchasePrice) : null),
        currentValue: b.current_value !== undefined ? Number(b.current_value) : (b.currentValue !== undefined ? Number(b.currentValue) : null),
        location: b.location || null,
        status: b.status || 'active',
        condition: b.condition || 'yaxşı',
        notes: b.notes || null,
        createdById: req.user.id,
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'create',
        entityType: 'asset',
        entityId: row.id,
        userId: req.user.id,
        userName: req.user.fullName || req.user.username,
        newData: row,
      }
    });

    res.json({ success: true, data: mapAsset(row) });
  } catch (err) { next(err); }
});

// UPDATE asset
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const b = req.body || {};

    const old = await prisma.asset.findUnique({ where: { id } });
    if (!old || old.deletedAt) return res.status(404).json({ success: false, error: 'Aktiv tapılmadı' });

    const row = await prisma.asset.update({
      where: { id },
      data: {
        name: b.name ?? undefined,
        category: b.category ?? undefined,
        serialNumber: b.serial_number ?? b.serialNumber ?? undefined,
        purchaseDate: b.purchase_date ?? b.purchaseDate ?? undefined,
        purchasePrice: b.purchase_price !== undefined ? Number(b.purchase_price) : (b.purchasePrice !== undefined ? Number(b.purchasePrice) : undefined),
        currentValue: b.current_value !== undefined ? Number(b.current_value) : (b.currentValue !== undefined ? Number(b.currentValue) : undefined),
        location: b.location ?? undefined,
        status: b.status ?? undefined,
        condition: b.condition ?? undefined,
        notes: b.notes ?? undefined,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'update',
        entityType: 'asset',
        entityId: id,
        userId: req.user.id,
        userName: req.user.fullName || req.user.username,
        oldData: old,
        newData: row,
      }
    });

    res.json({ success: true, data: mapAsset(row) });
  } catch (err) { next(err); }
});

// DELETE (soft delete)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: 'delete',
        entityType: 'asset',
        entityId: id,
        userId: req.user.id,
        userName: req.user.fullName || req.user.username,
      }
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET asset categories (distinct)
router.get('/meta/categories', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.asset.findMany({
      where: { deletedAt: null },
      select: { category: true },
      distinct: ['category'],
    });
    res.json({ success: true, data: rows.map(r => r.category).filter(Boolean) });
  } catch (err) { next(err); }
});

module.exports = router;
