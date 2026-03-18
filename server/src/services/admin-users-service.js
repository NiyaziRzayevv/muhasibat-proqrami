const { prisma } = require('../prisma');
const { hashPassword } = require('../utils/password');

async function createUser(data) {
  const created = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash: hashPassword(data.password),
      fullName: data.full_name || null,
      email: data.email || null,
      phone: data.phone || null,
      roleId: data.role_id || null,
      isActive: data.is_active ? true : false,
      approvalStatus: data.approval_status || 'approved',
    },
    include: { role: true },
  });

  return created;
}

async function updateUser(userId, data) {
  const updates = {};
  if (data.full_name !== undefined) updates.fullName = data.full_name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.role_id !== undefined) updates.roleId = data.role_id || null;
  if (data.is_active !== undefined) updates.isActive = data.is_active ? true : false;
  if (data.password) updates.passwordHash = hashPassword(data.password);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updates,
    include: { role: true },
  });

  return updated;
}

async function deactivateUser(userId) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    include: { role: true },
  });

  return updated;
}

async function deleteUser(userId) {
  if (userId === 1) throw new Error('Admin istifadəçi silinə bilməz');

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.passwordReset.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return { deleted: true };
}

module.exports = { createUser, updateUser, deactivateUser, deleteUser };
