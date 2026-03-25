const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

// POST /api/leave — staff submits leave
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, leaveDate, returnDate, reason } = req.body;
    if (!type || !leaveDate || !reason) return res.status(400).json({ error: 'Missing fields' });
    const leave = await prisma.leaveRequest.create({
      data: { userId: req.user.id, type, leaveDate: new Date(leaveDate), returnDate: returnDate ? new Date(returnDate) : null, reason },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    // Notify all supervisors
    const supervisors = await prisma.user.findMany({ where: { role: { in: ['supervisor','assistant'] }, isActive: true } });
    for (const sv of supervisors) {
      await createNotif(prisma, io, sv.id, { type:'absence', title:`Leave Request — ${req.user.name}`, body:`${type}: ${reason.substring(0,60)}`, refId: leave.id });
    }
    io.to('supervisors').emit('leave-submitted', { id: leave.id, reporter: req.user.name, role: req.user.role, type, reason });
    res.status(201).json({ leave });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/leave/mine — staff's own requests
router.get('/mine', authenticate, async (req, res) => {
  try {
    const requests = await prisma.leaveRequest.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 30 });
    res.json({ requests });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/leave/all — supervisor: all requests
router.get('/all', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status && status !== 'all' ? { status } : {};
    const requests = await prisma.leaveRequest.findMany({
      where, include: { user: { select: { name: true, staffId: true, role: true, section: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json({ requests });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/leave/:id — supervisor approves/declines
router.patch('/:id', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved','declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id }, data: { status, reviewedBy: req.user.id, reviewedAt: new Date() },
      include: { user: true },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    await createNotif(prisma, io, leave.userId, {
      type: 'absence',
      title: `Leave ${status === 'approved' ? 'Approved ✅' : 'Declined ❌'}`,
      body: `Your ${leave.type} request for ${new Date(leave.leaveDate).toDateString()} was ${status}.`,
      refId: leave.id,
    });
    io.emit('leave-updated', { id: leave.id, status, userId: leave.userId });
    res.json({ leave });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
