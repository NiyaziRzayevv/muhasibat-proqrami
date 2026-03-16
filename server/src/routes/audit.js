const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../utils/async-handler');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const auditService = require('../services/audit-service');
const { presentAuditLog } = require('../presenters/audit-log');

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const query = z.object({
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    action: z.string().optional(),
    entity_type: z.string().optional(),
    user_id: z.coerce.number().int().positive().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).parse(req.query);

  const logs = await auditService.getAuditLogs(query);
  return res.json({ success: true, data: logs.map(presentAuditLog) });
}));

router.post('/clear', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const body = z.object({ daysOld: z.coerce.number().int().positive().default(90) }).parse(req.body || {});
  const count = await auditService.clearOldLogs(body.daysOld);
  return res.json({ success: true, data: count });
}));

module.exports = { auditRouter: router };
