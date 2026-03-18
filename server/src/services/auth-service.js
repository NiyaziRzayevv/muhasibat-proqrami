const crypto = require('crypto');
const { prisma } = require('../prisma');
const { env } = require('../env');
const { verifyPassword, hashPassword } = require('../utils/password');
const { presentUser } = require('../presenters/user');

async function login(username, password) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user) return { success: false, error: 'İstifadəçi tapılmadı' };
  if (!verifyPassword(password, user.passwordHash)) return { success: false, error: 'Şifrə səhvdir' };
  if (!user.isActive) return { success: false, error: 'Hesabınız deaktiv edilib' };

  const isAdmin = user.username === 'admin' || user.role?.name === 'admin';
  if (!isAdmin) {
    if (user.approvalStatus === 'rejected') return { success: false, error: 'Qeydiyyatınız rədd edilib' };
    // Auto-approve pending users on login
    if (user.approvalStatus === 'pending') {
      await prisma.user.update({ where: { id: user.id }, data: { approvalStatus: 'approved' } });
    }
  } else if (user.approvalStatus !== 'approved') {
    await prisma.user.update({ where: { id: user.id }, data: { approvalStatus: 'approved' } });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

  return { success: true, data: { ...presentUser(user), token } };
}

async function logout(token) {
  const deleted = await prisma.session.deleteMany({ where: { token } });
  return { success: deleted.count > 0 };
}

async function verifyToken(token) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { role: true } } },
  });

  if (!session) return { success: false, error: 'invalid_token' };
  if (session.expiresAt && session.expiresAt <= new Date()) return { success: false, error: 'session_expired' };
  if (!session.user || !session.user.isActive) return { success: false, error: 'user_inactive' };

  return { success: true, data: presentUser(session.user) };
}

async function register(data) {
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) return { success: false, error: 'Bu istifadəçi adı artıq mövcuddur' };

  const defaultRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  if (!defaultRole) return { success: false, error: 'Default rol tapılmadı' };

  const created = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash: hashPassword(data.password),
      fullName: data.full_name || null,
      email: data.email || null,
      phone: data.phone || null,
      roleId: defaultRole.id,
      isActive: true,
      approvalStatus: 'approved',
    },
    include: { role: true },
  });

  // Auto-login: create session token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId: created.id, token, expiresAt } });

  return { success: true, data: { ...presentUser(created), token } };
}

async function requestPasswordReset(username, phone, email) {
  const user = await prisma.user.findFirst({
    where: {
      username,
      isActive: true,
    },
  });

  if (!user) return { success: false, error: 'İstifadəçi tapılmadı' };

  if (phone && user.phone !== phone) return { success: false, error: 'Telefon nömrəsi uyğun gəlmir' };
  if (email && user.email !== email) return { success: false, error: 'Email ünvanı uyğun gəlmir' };
  if (!phone && !email) return { success: false, error: 'Telefon və ya email daxil edin' };

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false,
    },
  });

  return {
    success: true,
    data: {
      resetToken,
      user: { id: user.id, username: user.username, full_name: user.fullName || null },
    },
  };
}

async function resetPassword(token, newPassword) {
  const reset = await prisma.passwordReset.findFirst({
    where: { token, used: false },
    include: { user: true },
  });

  if (!reset) return { success: false, error: 'Yanlış və ya istifadə olunmuş kod' };
  if (reset.expiresAt < new Date()) return { success: false, error: 'Kodun müddəti bitib' };

  await prisma.user.update({
    where: { id: reset.userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  await prisma.passwordReset.update({
    where: { id: reset.id },
    data: { used: true, usedAt: new Date() },
  });

  return { success: true };
}

module.exports = { login, logout, verifyToken, register, requestPasswordReset, resetPassword };
