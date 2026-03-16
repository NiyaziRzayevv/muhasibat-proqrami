const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../utils/async-handler');
const { prisma } = require('../prisma');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { presentRole } = require('../presenters/role');
const auditService = require('../services/audit-service');

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  return res.json({ success: true, data: roles.map(presentRole) });
}));

router.put('/:id/permissions', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const params = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);
  const body = z.object({ permissions: z.record(z.boolean()) }).parse(req.body);

  const updated = await prisma.role.update({
    where: { id: params.id },
    data: { permissions: body.permissions },
  });

  await auditService.logAction({
    action: 'UPDATE_ROLE_PERMISSIONS',
    entity_type: 'roles',
    entity_id: params.id,
    user_id: req.user.id,
    user_name: req.user.username,
    ip_address: req.ip,
    new_data: { permissions: body.permissions },
  });

  return res.json({ success: true, data: presentRole(updated) });
}));

module.exports = { rolesRouter: router };
