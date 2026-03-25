const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/assigned-tasks/mine — tasks assigned to me today
router.get('/mine', authenticate, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tasks = await prisma.assignedTask.findMany({
      where: { OR: [{ assignedToId: req.user.id }, { groupTarget: { not: null } }], taskDate: { gte: today } },
      include: { assignedBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // For group tasks, filter by role
    const filtered = tasks.filter(t => {
      if (t.assignedToId) return true;
      if (t.groupTarget === 'all') return true;
      if (t.groupTarget === `all-${req.user.role}s` || t.groupTarget === `all-${req.user.role}men`) return true;
      return false;
    });
    res.json({ tasks: filtered });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/assigned-tasks — supervisor: all today's assigned tasks
router.get('/', authenticate, requireSupervisor, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tasks = await prisma.assignedTask.findMany({
      where: { taskDate: { gte: today } },
      include: { assignedTo: { select: { name: true, staffId: true, role: true } }, assignedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tasks });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/assigned-tasks — supervisor assigns task
router.post('/', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { name, location, notes, priority, dueTime, assignedToId, groupTarget } = req.body;
    if (!name || !location) return res.status(400).json({ error: 'name and location required' });
    const task = await prisma.assignedTask.create({
      data: { name, location, notes, priority: priority||'normal', dueTime, assignedToId: assignedToId||null, groupTarget: groupTarget||null, assignedById: req.user.id },
      include: { assignedTo: { select: { name: true, id: true } } },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    if (task.assignedToId) {
      await createNotif(prisma, io, task.assignedToId, { type:'task', title:'New Task Assigned', body:`${name} at ${location}${dueTime?' — due '+dueTime:''}`, refId: task.id });
      io.to(`user:${task.assignedToId}`).emit('task-assigned', task);
    } else {
      // Group assignment — notify matching role
      io.to(`role:${groupTarget?.replace('all-','').replace('s','').replace('men','man')}`).emit('task-assigned', task);
    }
    res.status(201).json({ task });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/assigned-tasks/:id/done — worker marks done
router.patch('/:id/done', authenticate, async (req, res) => {
  try {
    const task = await prisma.assignedTask.update({
      where: { id: req.params.id }, data: { isDone: true, completedAt: new Date() },
    });
    const io = req.app.get('io');
    io.to('supervisors').emit('assigned-task-done', { id: task.id, completedBy: req.user.name, completedAt: task.completedAt });
    res.json({ task });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/assigned-tasks/:id — supervisor deletes
router.delete('/:id', authenticate, requireSupervisor, async (req, res) => {
  try {
    await prisma.assignedTask.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/assigned-tasks/reset — supervisor manual reset
router.post('/reset', authenticate, requireSupervisor, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    // Reset duty task completions for today
    await prisma.taskCompletion.deleteMany({ where: { taskDate: { gte: today } } });
    // Reset assigned tasks for today
    await prisma.assignedTask.updateMany({ where: { taskDate: { gte: today } }, data: { isDone: false, completedAt: null } });
    await prisma.appState.upsert({
      where: { id: 'singleton' }, update: { tasksResetAt: new Date() }, create: { id: 'singleton', tasksResetAt: new Date() },
    });
    const io = req.app.get('io');
    io.emit('tasks-reset', { resetAt: new Date().toISOString(), resetBy: req.user.name });
    res.json({ ok: true, resetAt: new Date() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
