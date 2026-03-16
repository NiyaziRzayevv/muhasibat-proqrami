const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../utils/async-handler');
const authService = require('../services/auth-service');
const auditService = require('../services/audit-service');

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const body = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }).parse(req.body);

  const result = await authService.login(body.username, body.password);
  if (result?.success && result?.data?.id) {
    await auditService.logAction({
      action: 'LOGIN',
      entity_type: 'users',
      entity_id: result.data.id,
      user_id: result.data.id,
      user_name: result.data.username,
      ip_address: req.ip,
    });
  }
  return res.json(result);
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(1) }).parse(req.body);
  const result = await authService.logout(body.token);
  return res.json(result);
}));

router.post('/verify', asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(1) }).parse(req.body);
  const result = await authService.verifyToken(body.token);
  return res.json(result);
}));

router.post('/register', asyncHandler(async (req, res) => {
  const body = z.object({
    username: z.string().min(3),
    password: z.string().min(4),
    full_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).parse(req.body);

  const result = await authService.register(body);
  if (result?.success && result?.data?.id) {
    await auditService.logAction({
      action: 'CREATE_USER',
      entity_type: 'users',
      entity_id: result.data.id,
      user_id: result.data.id,
      user_name: result.data.username,
      ip_address: req.ip,
      new_data: { username: result.data.username },
    });
  }
  return res.json(result);
}));

router.post('/requestPasswordReset', asyncHandler(async (req, res) => {
  const body = z.object({
    username: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).parse(req.body);

  const result = await authService.requestPasswordReset(body.username, body.phone || '', body.email || '');
  if (result?.success && result?.data?.user?.id) {
    await auditService.logAction({
      action: 'REQUEST_PASSWORD_RESET',
      entity_type: 'users',
      entity_id: result.data.user.id,
      user_id: result.data.user.id,
      user_name: result.data.user.username,
      ip_address: req.ip,
    });
  }
  return res.json(result);
}));

router.post('/resetPassword', asyncHandler(async (req, res) => {
  const body = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(6),
  }).parse(req.body);

  const result = await authService.resetPassword(body.token, body.newPassword);
  if (result?.success) {
    await auditService.logAction({
      action: 'RESET_PASSWORD',
      entity_type: 'users',
      ip_address: req.ip,
    });
  }
  return res.json(result);
}));

module.exports = { authRouter: router };
