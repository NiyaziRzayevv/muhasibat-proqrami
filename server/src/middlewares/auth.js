const { prisma } = require('../prisma');

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  return value.slice('bearer '.length).trim();
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ success: false, error: 'unauthorized' });

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { role: true } } },
  });

  if (!session) return res.status(401).json({ success: false, error: 'unauthorized' });
  if (session.expiresAt && session.expiresAt <= new Date()) {
    return res.status(401).json({ success: false, error: 'session_expired' });
  }
  if (!session.user || !session.user.isActive) return res.status(401).json({ success: false, error: 'user_inactive' });

  req.session = session;
  req.user = session.user;
  return next();
}

function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
  const isAdmin = user.username === 'admin' || user.role?.name === 'admin';
  if (!isAdmin) return res.status(403).json({ success: false, error: 'forbidden' });
  return next();
}

module.exports = { requireAuth, requireAdmin };
