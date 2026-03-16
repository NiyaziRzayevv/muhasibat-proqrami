const { prisma } = require('../prisma');

function computeAccessExpiry(accessType, customDuration) {
  const now = new Date();
  if (accessType === 'daily') {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 1);
    return exp;
  }
  if (accessType === 'monthly') {
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);
    return exp;
  }
  if (accessType === 'lifetime') return null;
  if (accessType === 'custom') {
    const unit = customDuration?.unit;
    const value = Number(customDuration?.value);
    if (!unit || !Number.isFinite(value) || value <= 0) {
      return { error: 'Müddət düzgün deyil' };
    }
    let ms = 0;
    if (unit === 'minute') ms = value * 60 * 1000;
    else if (unit === 'hour') ms = value * 60 * 60 * 1000;
    else return { error: 'Müddət vahidi düzgün deyil' };
    return new Date(now.getTime() + ms);
  }
  return { error: 'Yanlış icazə növü' };
}

async function checkUserAccess(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return { hasAccess: false, reason: 'user_not_found' };
  if (user.role?.name === 'admin' || user.username === 'admin') return { hasAccess: true, accessType: 'lifetime' };
  if (!user.accessType) return { hasAccess: false, reason: 'no_access' };
  if (user.accessType === 'lifetime') return { hasAccess: true, accessType: 'lifetime' };
  if (user.accessExpiresAt && user.accessExpiresAt < new Date()) {
    return { hasAccess: false, reason: 'expired', expiredAt: user.accessExpiresAt.toISOString() };
  }
  return {
    hasAccess: true,
    accessType: user.accessType,
    expiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
  };
}

async function grantAccess(userId, accessType, grantedById, customDuration) {
  const exp = computeAccessExpiry(accessType, customDuration);
  if (exp && exp.error) return { success: false, error: exp.error };

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessType,
      accessExpiresAt: exp === null ? null : exp,
      accessGrantedById: grantedById,
      accessGrantedAt: new Date(),
      isActive: true,
    },
  });

  return { success: true };
}

async function revokeAccess(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      accessType: null,
      accessExpiresAt: null,
      accessGrantedById: null,
      accessGrantedAt: null,
    },
  });
  return { success: true };
}

async function approveUser(userId, approvedById) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: 'approved',
      isActive: true,
      approvedById,
      approvedAt: new Date(),
    },
  });
  return { success: true };
}

async function rejectUser(userId, approvedById) {
  const updated = await prisma.user.updateMany({
    where: { id: userId, approvalStatus: 'pending' },
    data: {
      approvalStatus: 'rejected',
      approvedById,
      approvedAt: new Date(),
      isActive: false,
    },
  });
  return { success: updated.count > 0 };
}

module.exports = { checkUserAccess, grantAccess, revokeAccess, approveUser, rejectUser };
