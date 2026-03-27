const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/messages/conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const myId = req.user.id;
    const myRole = req.user.role;

    // Get all messages this user sent or received
    const msgs = await prisma.message.findMany({
      where: { OR: [{ fromId: myId }, { toId: myId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { id:true, name:true, staffId:true, role:true, avatarUrl:true } },
        to:   { select: { id:true, name:true, staffId:true, role:true, avatarUrl:true } },
      },
    });

    // Build unique conversation map from message history
    const seen = new Map();
    msgs.forEach(m => {
      const partnerId = m.fromId === myId ? m.toId   : m.fromId;
      const partner   = m.fromId === myId ? m.to     : m.from;
      if (!seen.has(partnerId)) {
        seen.set(partnerId, { partner, lastMessage: m, unread: 0 });
      }
      if (m.toId === myId && !m.isRead) seen.get(partnerId).unread++;
    });

    // Always include ALL other active users so anyone can message anyone
    const everyone = await prisma.user.findMany({
      where: { isActive: true, id: { not: myId } },
      select: { id:true, name:true, staffId:true, role:true, avatarUrl:true },
      orderBy: { name: 'asc' },
    });
    everyone.forEach(u => {
      if (!seen.has(u.id)) {
        seen.set(u.id, { partner: u, lastMessage: null, unread: 0 });
      }
    });

    // Sort: conversations with messages first, then by name
    const result = Array.from(seen.values()).sort((a, b) => {
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      }
      return a.partner.name.localeCompare(b.partner.name);
    });

    res.json({ conversations: result });
  } catch(e) {
    console.error('conversations error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/messages/:partnerId — full thread
router.get('/:partnerId', authenticate, async (req, res) => {
  try {
    const myId = req.user.id;
    const msgs = await prisma.message.findMany({
      where: { OR: [
        { fromId: myId, toId: req.params.partnerId },
        { fromId: req.params.partnerId, toId: myId },
      ]},
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    await prisma.message.updateMany({
      where: { fromId: req.params.partnerId, toId: myId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    res.json({ messages: msgs });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/messages — REST fallback when socket unavailable
router.post('/', authenticate, async (req, res) => {
  try {
    const { toId, text } = req.body;
    if (!toId || !text?.trim()) return res.status(400).json({ error: 'toId and text required' });
    const msg = await prisma.message.create({
      data: { fromId: req.user.id, toId, text: text.trim() },
      include: { from: { select: { name:true, role:true } } },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    io.to(`user:${toId}`).emit('new-message', {
      id: msg.id, fromId: req.user.id, fromName: msg.from.name,
      text: msg.text, createdAt: msg.createdAt, isRead: false,
    });
    await createNotif(prisma, io, toId, {
      type: 'message', title: `Message from ${msg.from.name}`,
      body: text.substring(0, 80), refId: msg.id,
    });
    res.status(201).json({ message: msg });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
