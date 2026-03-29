const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'socs_jwt_secret_change_in_production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h';

function formatUser(user) {
  return {
    id:        user.id,
    staffId:   user.staffId,
    name:      user.name,
    role:      user.role,
    email:     user.email || '',
    phone:     user.phone || '',
    section:   user.section || '',
    avatarUrl: user.avatarUrl || null,
    initials:  user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(),
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { staffId, password } = req.body;
    if (!staffId || !password)
      return res.status(400).json({ message: 'Staff ID and password are required' });
    const user = await prisma.user.findFirst({
      where: { OR: [{ staffId: staffId.toUpperCase() }, { email: staffId.toLowerCase() }], isActive: true },
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, staffId: user.staffId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: formatUser(req.user) });
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const data = {};
    if (name?.trim())  data.name  = name.trim();
    if (phone?.trim()) data.phone = phone.trim();
    if (email?.trim()) data.email = email.trim();
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' });
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ user: formatUser(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/staff — list all staff with live status + daysWorked
router.get('/staff', authenticate, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const staff = await prisma.user.findMany({
      where: { role: { in: ['cleaner','watchman','assistant'] }, isActive: true },
      select: { id:true, staffId:true, name:true, role:true, section:true, avatarUrl:true },
      orderBy: { name: 'asc' },
    });

    const [attendance, monthAtt, taskCompletions, dutyTasks] = await Promise.all([
      prisma.attendance.findMany({
        where: { shiftDate: today },
        select: { userId:true, clockIn:true, clockOut:true, hoursWorked:true, isLate:true },
      }),
      prisma.attendance.findMany({
        where: { shiftDate: { gte: monthStart } },
        select: { userId:true },
      }),
      prisma.taskCompletion.findMany({
        where: { taskDate: today },
        select: { userId:true, taskId:true },
      }),
      prisma.dutyTask.findMany({ where: { isActive: true } }),
    ]);

    const attMap   = Object.fromEntries(attendance.map(a => [a.userId, a]));
    const taskMap  = taskCompletions.reduce((acc,c) => { acc[c.userId]=(acc[c.userId]||0)+1; return acc; }, {});
    const totalMap = dutyTasks.reduce((acc,t) => { acc[t.assignedRole]=(acc[t.assignedRole]||0)+1; return acc; }, {});
    const daysMap  = monthAtt.reduce((acc,a) => { acc[a.userId]=(acc[a.userId]||0)+1; return acc; }, {});

    const result = staff.map(s => ({
      ...s,
      initials:   s.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(),
      clockIn:    attMap[s.id]?.clockIn    || null,
      clockOut:   attMap[s.id]?.clockOut   || null,
      hoursWorked:attMap[s.id]?.hoursWorked|| null,
      isLate:     attMap[s.id]?.isLate     || false,
      status:     attMap[s.id] ? 'in' : 'out',
      tasksDone:  taskMap[s.id]  || 0,
      tasksTotal: totalMap[s.role] || 0,
      daysWorked: daysMap[s.id]  || 0,
    }));
    res.json({ staff: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST /api/auth/staff — supervisor creates new staff account
router.post('/staff', authenticate, requireSupervisor, async (req, res) => {
  try {
    const { name, role, staffId, password, phone, email, section } = req.body;
    if (!name?.trim() || !role || !staffId?.trim() || !password)
      return res.status(400).json({ error: 'Name, role, staffId and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const validRoles = ['cleaner','watchman','assistant','supervisor'];
    if (!validRoles.includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    const exists = await prisma.user.findFirst({ where: { staffId: staffId.toUpperCase() } });
    if (exists) return res.status(409).json({ error: `Staff ID ${staffId.toUpperCase()} already exists` });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        staffId:  staffId.toUpperCase(),
        name:     name.trim(),
        role,
        password: hashed,
        phone:    phone?.trim() || null,
        email:    email?.trim() || null,
        section:  section?.trim() || null,
        isActive: true,
      },
    });
    res.status(201).json({ user: formatUser(user), message: `${name} added successfully` });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Staff ID already exists' });
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// DELETE /api/auth/staff/:id — supervisor deactivates staff
router.delete('/staff/:id', authenticate, requireSupervisor, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Staff deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate staff' });
  }
});

module.exports = router;
