// src/routes/dashboard.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/overview — supervisor: live summary stats
router.get('/overview', authenticate, requireSupervisor, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalStaff, clockedIn, pendingSupplies, openIncidents, tasksDone, totalTasks] = await Promise.all([
      prisma.user.count({ where: { isActive: true, role: { notIn: ['supervisor', 'admin'] } } }),
      prisma.attendance.count({ where: { shiftDate: today, clockOut: null } }),
      prisma.supplyRequest.count({ where: { status: 'pending' } }),
      prisma.incident.count({ where: { status: { in: ['open', 'in_progress'] } } }),
      prisma.taskCompletion.count({ where: { taskDate: today } }),
      prisma.dutyTask.count({ where: { isActive: true } }),
    ]);

    const taskRate = totalTasks > 0 ? Math.round((tasksDone / totalTasks) * 100) : 0;

    res.json({
      totalStaff,
      clockedIn,
      pendingSupplies,
      openIncidents,
      taskCompletionRate: taskRate,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/dashboard/staff-status — supervisor: per-staff live view
router.get('/staff-status', authenticate, requireSupervisor, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const staff = await prisma.user.findMany({
      where: { isActive: true, role: { notIn: ['supervisor', 'admin'] } },
      select: { id: true, name: true, staffId: true, role: true },
    });

    const statuses = await Promise.all(
      staff.map(async (s) => {
        const att = await prisma.attendance.findFirst({
          where: { userId: s.id, shiftDate: today },
          orderBy: { clockIn: 'desc' },
        });

        const taskCount = await prisma.dutyTask.count({ where: { assignedRole: s.role, isActive: true } });
        const doneCount = await prisma.taskCompletion.count({ where: { userId: s.id, taskDate: today } });

        return {
          ...s,
          clockedIn: att ? !att.clockOut : false,
          clockInTime: att?.clockIn || null,
          isLate: att?.isLate || false,
          tasksDone: doneCount,
          tasksTotal: taskCount,
        };
      })
    );

    res.json({ staff: statuses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff status' });
  }
});

module.exports = router;
