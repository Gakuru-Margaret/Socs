const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const sections = await prisma.section.findMany({
      include: { members: { include: { user: { select: { id:true, name:true, staffId:true, role:true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ sections });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const section = await prisma.section.create({ data: { name, icon: icon||'🧹', description } });
    res.status(201).json({ section });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/members', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { userId } = req.body;
    // Remove from all other sections first
    await prisma.sectionMember.deleteMany({ where: { userId } });
    const member = await prisma.sectionMember.create({ data: { sectionId: req.params.id, userId } });
    // Update user.section
    const section = await prisma.section.findUnique({ where: { id: req.params.id } });
    await prisma.user.update({ where: { id: userId }, data: { section: section.name } });
    res.status(201).json({ member });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/members/:userId', authenticate, requireSupervisor, async (req, res) => {
  try {
    await prisma.sectionMember.deleteMany({ where: { sectionId: req.params.id, userId: req.params.userId } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireSupervisor, async (req, res) => {
  try {
    await prisma.section.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
