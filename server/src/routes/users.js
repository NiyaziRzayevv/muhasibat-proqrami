const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../utils/async-handler');
const { prisma } = require('../prisma');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const usersService = require('../services/users-service');
const adminUsersService = require('../services/admin-users-service');
const auditService = require('../services/audit-service');
const { presentUser } = require('../presenters/user');

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { role: true },
  });

  if (!user) return res.status(404).json({ success: false, error: 'user_not_found' });
  return res.json({ success: true, data: presentUser(user) });
}));

router.get('/me/access', requireAuth, asyncHandler(async (req, res) => {
  const result = await usersService.checkUserAccess(req.user.id);
  return res.json({ success: true, data: result });
}));

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ success: true, data: users.map(presentUser) });
}));

router.get('/pending', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { approvalStatus: 'pending' },
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });

  return res.json({ success: true, data: users.map(presentUser) });
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = z.object({
    username: z.string().min(1),
    password: z.string().min(4),
    full_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role_id: z.coerce.number().int().positive().optional(),
    is_active: z.union([z.boolean(), z.number()]).optional(),
    approval_status: z.string().optional(),
  }).parse(req.body);

  const created = await adminUsersService.createUser({
    ...body,
    is_active: body.is_active === undefined ? true : !!body.is_active,
  });

  await auditService.logAction({
    action: 'CREATE_USER',
    entity_type: 'users',
    entity_id: created.id,
    user_id: req.user.id,
    user_name: req.user.username,
    ip_address: req.ip,
    new_data: { username: created.username, role_id: created.roleId ?? null },
  });

  return res.json({ success: true, data: presentUser(created) });
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const body = z.object({
    full_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    role_id: z.union([z.number(), z.string()]).optional(),
    is_active: z.union([z.boolean(), z.number()]).optional(),
    password: z.string().min(4).optional(),
  }).parse(req.body);

  const updated = await adminUsersService.updateUser(params.id, {
    ...body,
    role_id: body.role_id !== undefined ? Number(body.role_id) : undefined,
    is_active: body.is_active === undefined ? undefined : !!body.is_active,
  });

  const { password: _pw, ...safeBody } = body;
  await auditService.logAction({
    action: 'UPDATE_USER',
    entity_type: 'users',
    entity_id: params.id,
    user_id: req.user.id,
    user_name: req.user.username,
    ip_address: req.ip,
    new_data: safeBody,
  });

  return res.json({ success: true, data: presentUser(updated) });
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const force = req.query.force === 'true';
  if (force) {
    await adminUsersService.deleteUser(params.id);
  } else {
    await adminUsersService.deactivateUser(params.id);
  }

  await auditService.logAction({
    action: 'DELETE_USER',
    entity_type: 'users',
    entity_id: params.id,
    user_id: req.user.id,
    user_name: req.user.username,
    ip_address: req.ip,
  });

  return res.json({ success: true });
}));

router.post('/:id/approve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const result = await usersService.approveUser(params.id, req.user.id);

  if (result?.success) {
    await auditService.logAction({
      action: 'APPROVE_USER',
      entity_type: 'users',
      entity_id: params.id,
      user_id: req.user.id,
      user_name: req.user.username,
      ip_address: req.ip,
    });
  }

  return res.json(result);
}));

router.post('/:id/reject', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const result = await usersService.rejectUser(params.id, req.user.id);

  if (result?.success) {
    await auditService.logAction({
      action: 'REJECT_USER',
      entity_type: 'users',
      entity_id: params.id,
      user_id: req.user.id,
      user_name: req.user.username,
      ip_address: req.ip,
    });
  }

  return res.json(result);
}));

router.post('/:id/grant-access', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const body = z.object({
    accessType: z.enum(['daily', 'monthly', 'lifetime', 'custom']),
    customDuration: z.object({
      value: z.union([z.string(), z.number()]).optional(),
      unit: z.enum(['minute', 'hour']).optional(),
    }).optional(),
  }).parse(req.body);

  const result = await usersService.grantAccess(params.id, body.accessType, req.user.id, body.customDuration || null);

  if (result?.success) {
    await auditService.logAction({
      action: 'GRANT_ACCESS',
      entity_type: 'users',
      entity_id: params.id,
      user_id: req.user.id,
      user_name: req.user.username,
      ip_address: req.ip,
      new_data: { accessType: body.accessType, customDuration: body.customDuration || null },
    });
  }

  return res.json(result);
}));

router.post('/:id/revoke-access', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const result = await usersService.revokeAccess(params.id);

  if (result?.success) {
    await auditService.logAction({
      action: 'REVOKE_ACCESS',
      entity_type: 'users',
      entity_id: params.id,
      user_id: req.user.id,
      user_name: req.user.username,
      ip_address: req.ip,
    });
  }

  return res.json(result);
}));

router.get('/:id/access', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const result = await usersService.checkUserAccess(params.id);
  return res.json({ success: true, data: result });
}));

module.exports = { usersRouter: router };
