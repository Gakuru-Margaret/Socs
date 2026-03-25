// src/routes/supplies.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/supplies — get own supply requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const where = { userId: req.user.id };
    if (status && status !== 'all') where.status = status;

    const requests = await prisma.supplyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch supply requests' });
  }
});

// POST /api/supplies — create new request
router.post('/', authenticate, async (req, res) => {
  try {
    const { itemName, category, urgency, notes } = req.body;
    if (!itemName) return res.status(400).json({ error: 'Item name is required' });

    const request = await prisma.supplyRequest.create({
      data: { userId: req.user.id, itemName, category, urgency: urgency || 'normal', notes },
    });

    // Notify supervisors in real-time
    const io = req.app.get('io');
    io.to('supervisors').emit('supply-request', {
      id: request.id,
      item: itemName,
      urgency,
      reporter: req.user.name,
      time: request.createdAt,
    });

    res.status(201).json({ message: 'Supply request submitted', request });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// GET /api/supplies/all — supervisor: all pending requests
router.get('/all', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const where = status !== 'all' ? { status } : {};

    const requests = await prisma.supplyRequest.findMany({
      where,
      include: { user: { select: { name: true, staffId: true, role: true } } },
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all requests' });
  }
});

// PATCH /api/supplies/:id/status — supervisor: approve or reject
router.patch('/:id/status', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'fulfilled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.supplyRequest.update({
      where: { id: req.params.id },
      data: { status, approvedBy: req.user.id, approvedAt: new Date() },
    });

    const io = req.app.get('io');
    io.emit('supply-status-updated', { id: req.params.id, status });

    res.json({ message: `Request ${status}`, request: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;
