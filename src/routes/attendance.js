// src/routes/attendance.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/attendance/clock-in
router.post('/clock-in', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today without clock-out
    const existing = await prisma.attendance.findFirst({
      where: { userId: req.user.id, shiftDate: today, clockOut: null },
    });

    if (existing) {
      return res.status(400).json({ error: 'You are already clocked in. Please clock out first.' });
    }

    // Determine if late (after 08:00)
    const now = new Date();
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 0);

    const record = await prisma.attendance.create({
      data: { userId: req.user.id, isLate, shiftDate: today },
    });

    // Emit real-time update to supervisors
    const io = req.app.get('io');
    io.to('supervisors').emit('staff-clocked-in', {
      userId: req.user.id, name: req.user.name, time: record.clockIn,
    });

    res.json({ message: 'Clocked in successfully', record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findFirst({
      where: { userId: req.user.id, shiftDate: today, clockOut: null },
    });

    if (!record) {
      return res.status(400).json({ error: 'No active clock-in found for today.' });
    }

    const clockOut = new Date();
    const hoursWorked = (clockOut - record.clockIn) / 3600000; // ms to hours

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut, hoursWorked: parseFloat(hoursWorked.toFixed(2)) },
    });

    const io = req.app.get('io');
    io.to('supervisors').emit('staff-clocked-out', {
      userId: req.user.id, name: req.user.name, time: clockOut,
    });

    res.json({ message: 'Clocked out successfully', record: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// GET /api/attendance/my — get own history
router.get('/my', authenticate, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id, shiftDate: { gte: since } },
      orderBy: { clockIn: 'desc' },
    });

    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/today — supervisor: all staff today
router.get('/today', authenticate, requireSupervisor, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await prisma.attendance.findMany({
      where: { shiftDate: today },
      include: { user: { select: { id: true, name: true, role: true, staffId: true } } },
      orderBy: { clockIn: 'asc' },
    });

    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
});

// GET /api/attendance/stats — own monthly stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id, shiftDate: { gte: startOfMonth }, clockOut: { not: null } },
    });

    const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const lateDays = records.filter(r => r.isLate).length;

    res.json({
      daysWorked: records.length,
      totalHours: parseFloat(totalHours.toFixed(1)),
      lateDays,
      attendanceRate: records.length > 0 ? Math.round((records.length / 22) * 100) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
