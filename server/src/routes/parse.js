const { Router } = require('express');
const { requireAuth } = require('../middlewares/auth');
const { parseUniversal } = require('../services/parser-service');

const router = Router();

router.post('/universal', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.json({ success: false, error: 'Boş mətn' });
    }
    const result = parseUniversal(text.trim());
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
