const { prisma } = require('../prisma');

async function logAction(data) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entity_type ?? null,
        entityId: data.entity_id ?? null,
        userId: data.user_id ?? null,
        userName: data.user_name ?? null,
        oldData: data.old_data ?? null,
        newData: data.new_data ?? null,
        ipAddress: data.ip_address ?? null,
      },
    });
  } catch (_) {
  }
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function getAuditLogs(filters = {}) {
  const where = {};

  if (filters.action) where.action = { contains: String(filters.action), mode: 'insensitive' };
  if (filters.entity_type) where.entityType = String(filters.entity_type);
  if (filters.user_id) where.userId = Number(filters.user_id);

  const search = filters.search ? String(filters.search) : '';
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entityType: { contains: search, mode: 'insensitive' } },
      { userName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const start = parseDate(filters.startDate);
  const end = parseDate(filters.endDate);
  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = start;
    if (end) {
      const endPlus = new Date(end);
      endPlus.setHours(23, 59, 59, 999);
      where.createdAt.lte = endPlus;
    }
  }

  const take = Math.max(1, Math.min(Number(filters.limit || 200), 500));

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  });

  return logs;
}

async function clearOldLogs(daysOld = 90) {
  const d = Number(daysOld);
  const days = Number.isFinite(d) && d > 0 ? d : 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return res.count;
}

module.exports = { logAction, getAuditLogs, clearOldLogs };
