const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { prisma } = require('../prisma');

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.setting.findMany();
    const data = {};
    for (const r of rows) data[r.key] = r.value;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const entries = Object.entries(body);
    await prisma.$transaction(entries.map(([key, value]) => prisma.setting.upsert({
      where: { key },
      update: { value: value === undefined ? null : String(value) },
      create: { key, value: value === undefined ? null : String(value) },
    })));

    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/telegram/test', requireAuth, async (req, res, next) => {
  try {
    const { telegram_bot_token, telegram_chat_id, message } = req.body || {};
    const botToken = telegram_bot_token || null;
    const chatId = telegram_chat_id || null;
    if (!botToken || !chatId) {
      return res.status(400).json({ success: false, error: 'telegram_credentials_missing' });
    }

    const text = message || '🔔 Test mesajı: SmartQeyd Telegram İnteqrasiyası işləyir!';

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const tgText = await tgRes.text();
    let tgJson = null;
    try { tgJson = tgText ? JSON.parse(tgText) : null; } catch {}

    if (!tgRes.ok || !tgJson?.ok) {
      return res.status(400).json({ success: false, error: tgJson?.description || 'telegram_error' });
    }

    res.json({ success: true, data: tgJson?.result || true });
  } catch (err) { next(err); }
});

module.exports = router;
