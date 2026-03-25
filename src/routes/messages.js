const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/messages/conversations — list all conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const myId = req.user.id;
    // Get all users this person has a conversation with
    const msgs = await prisma.message.findMany({
      where: { OR: [{ fromId: myId }, { toId: myId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { id: true, name: true, staffId: true, role: true } },
        to:   { select: { id: true, name: true, staffId: true, role: true } },
      },
    });
    // Build unique conversation list
    const seen = new Map();
    msgs.forEach(m => {
      const partnerId = m.fromId === myId ? m.toId : m.fromId;
      const partner   = m.fromId === myId ? m.to : m.from;
      if (!seen.has(partnerId)) {
        seen.set(partnerId, { partner, lastMessage: m, unread: 0 });
      }
      // Count unread from partner
      if (m.toId === myId && !m.isRead) seen.get(partnerId).unread++;
    });
    // For supervisors who haven't messaged a staff yet, include all staff
    if (req.user.role === 'supervisor' || req.user.role === 'assistant') {
      const allStaff = await prisma.user.findMany({
        where: { role: { in: ['cleaner','watchman','assistant'] }, isActive: true },
        select: { id: true, name: true, staffId: true, role: true },
      });
      allStaff.forEach(s => { if (!seen.has(s.id)) seen.set(s.id, { partner: s, lastMessage: null, unread: 0 }); });
    }
    res.json({ conversations: Array.from(seen.values()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/messages/:partnerId — full thread
router.get('/:partnerId', authenticate, async (req, res) => {
  try {
    const myId = req.user.id;
    const msgs = await prisma.message.findMany({
      where: { OR: [{ fromId: myId, toId: req.params.partnerId }, { fromId: req.params.partnerId, toId: myId }] },
      orderBy: { createdAt: 'asc' }, take: 100,
    });
    // Mark as read
    await prisma.message.updateMany({
      where: { fromId: req.params.partnerId, toId: myId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ messages: msgs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/messages — send via REST (fallback if socket unavailable)
router.post('/', authenticate, async (req, res) => {
  try {
    const { toId, text } = req.body;
    if (!toId || !text?.trim()) return res.status(400).json({ error: 'toId and text required' });
    const msg = await prisma.message.create({
      data: { fromId: req.user.id, toId, text: text.trim() },
      include: { from: { select: { name: true, role: true } } },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    io.to(`user:${toId}`).emit('new-message', { id: msg.id, fromId: req.user.id, fromName: msg.from.name, text: msg.text, createdAt: msg.createdAt, isRead: false });
    await createNotif(prisma, io, toId, { type:'message', title:`Message from ${msg.from.name}`, body: text.substring(0,80), refId: msg.id });
    res.status(201).json({ message: msg });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
