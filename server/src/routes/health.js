const { Router } = require('express');
const { prisma } = require('../prisma');

const router = Router();

router.get('/', (req, res) => {
  return res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.get('/db', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ success: true, data: { status: 'ok', db: 'ok', time: new Date().toISOString() } });
  } catch (err) {
    return next(err);
  }
});

module.exports = { healthRouter: router };
