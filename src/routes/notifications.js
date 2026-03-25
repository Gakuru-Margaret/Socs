const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user.id, isDismissed: false },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    res.json({ notifications: notifs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/dismiss', authenticate, async (req, res) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isDismissed: true, isRead: true } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
