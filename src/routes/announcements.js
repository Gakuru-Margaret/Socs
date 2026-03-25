const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const announcements = await prisma.announcement.findMany({
      where: { OR: [{ target: 'all' }, { target: role }] },
      orderBy: { createdAt: 'desc' }, take: 20,
      include: { author: { select: { name: true } } },
    });
    res.json({ announcements });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { title, body, priority, target } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });
    const ann = await prisma.announcement.create({
      data: { title, body, priority: priority||'normal', target: target||'all', authorId: req.user.id },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    // Push to targeted users
    const where = target === 'all' ? {} : { role: target };
    const targets = await prisma.user.findMany({ where: { ...where, isActive: true }, select: { id: true } });
    for (const u of targets) {
      await createNotif(prisma, io, u.id, { type:'announcement', title:`📢 ${title}`, body: body.substring(0,80), refId: ann.id });
    }
    io.emit('announcement', { ...ann, authorName: req.user.name });
    res.status(201).json({ announcement: ann });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
