// src/routes/tasks.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/tasks — get today's tasks for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await prisma.dutyTask.findMany({
      where: { assignedRole: req.user.role, isActive: true },
    });

    const completions = await prisma.taskCompletion.findMany({
      where: { userId: req.user.id, taskDate: today },
      select: { taskId: true, completedAt: true, proofPhoto: true },
    });

    const completedMap = completions.reduce((acc, c) => {
      acc[c.taskId] = c;
      return acc;
    }, {});

    const result = tasks.map(t => ({
      ...t,
      completed: !!completedMap[t.id],
      completedAt: completedMap[t.id]?.completedAt || null,
      hasProof: !!completedMap[t.id]?.proofPhoto,
    }));

    res.json({ tasks: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completion = await prisma.taskCompletion.upsert({
      where: { taskId_userId_taskDate: { taskId: req.params.id, userId: req.user.id, taskDate: today } },
      update: { completedAt: new Date() },
      create: { taskId: req.params.id, userId: req.user.id, taskDate: today },
    });

    const io = req.app.get('io');
    io.to('supervisors').emit('task-completed', {
      userId: req.user.id, name: req.user.name, taskId: req.params.id,
    });

    res.json({ message: 'Task marked complete', completion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// POST /api/tasks/:id/uncomplete
router.post('/:id/uncomplete', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.taskCompletion.deleteMany({
      where: { taskId: req.params.id, userId: req.user.id, taskDate: today },
    });

    res.json({ message: 'Task uncompleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

module.exports = router;
