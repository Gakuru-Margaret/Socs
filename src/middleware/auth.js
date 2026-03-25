const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'socs_jwt_secret_change_in_production';

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, staffId: true, name: true, role: true,
        email: true, phone: true, section: true, avatarUrl: true, isActive: true,
      },
    });

    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Invalid or deactivated account' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

const requireSupervisor = requireRole('supervisor', 'admin', 'assistant');
const requireStaff = requireRole('cleaner', 'watchman', 'assistant', 'supervisor', 'admin');

module.exports = { authenticate, requireRole, requireSupervisor, requireStaff };
