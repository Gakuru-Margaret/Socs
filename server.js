require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });
const app    = express();
const server = http.createServer(app);

// ── CORS — lock to your domain in production ──
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000']
  : '*';

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});
app.set('io', io);
app.set('prisma', prisma);

// ── MIDDLEWARE ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── RATE LIMITS ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// ── STATIC FILES ──
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── ROUTES ──
app.use('/api/auth',           require('./src/routes/auth'));
app.use('/api/attendance',     require('./src/routes/attendance'));
app.use('/api/tasks',          require('./src/routes/tasks'));
app.use('/api/supplies',       require('./src/routes/supplies'));
app.use('/api/incidents',      require('./src/routes/incidents'));
app.use('/api/leave',          require('./src/routes/leave'));
app.use('/api/messages',       require('./src/routes/messages'));
app.use('/api/assigned-tasks', require('./src/routes/assignedTasks'));
app.use('/api/announcements',  require('./src/routes/announcements'));
app.use('/api/sections',       require('./src/routes/sections'));
app.use('/api/notifications',  require('./src/routes/notifications'));
app.use('/api/dashboard',      require('./src/routes/dashboard'));
app.use('/api/upload',         require('./src/routes/upload'));

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => res.json({
  status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV,
}));

// ── SOCKET.IO ──
const connectedUsers = new Map();

io.on('connection', (socket) => {
  socket.on('authenticate', ({ userId, role, staffId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.role   = role;
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
    if (role === 'supervisor' || role === 'assistant') socket.join('supervisors');
    socket.emit('authenticated', { ok: true });
  });

  socket.on('send-message', async ({ toId, text }) => {
    if (!socket.userId || !text?.trim()) return;
    try {
      const msg = await prisma.message.create({
        data: { fromId: socket.userId, toId, text: text.trim() },
        include: { from: { select: { name: true, staffId: true, role: true } } },
      });
      io.to(`user:${toId}`).emit('new-message', {
        id: msg.id, fromId: msg.fromId, fromName: msg.from.name,
        fromRole: msg.from.role, text: msg.text, createdAt: msg.createdAt, isRead: false,
      });
      socket.emit('message-sent', { id: msg.id, createdAt: msg.createdAt });
      await createNotification(prisma, io, toId, {
        type: 'message', title: `Message from ${msg.from.name}`,
        body: text.trim().substring(0, 80), refId: msg.id,
      });
    } catch(e) { console.error('send-message error:', e.message); }
  });

  socket.on('mark-messages-read', async ({ fromId }) => {
    if (!socket.userId) return;
    await prisma.message.updateMany({
      where: { fromId, toId: socket.userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    }).catch(() => {});
    io.to(`user:${fromId}`).emit('messages-read', { byId: socket.userId });
  });

  socket.on('disconnect', () => {
    if (socket.userId) connectedUsers.delete(socket.userId);
  });
});

// ── NOTIFICATION HELPER ──
async function createNotification(prisma, io, userId, { type, title, body, refId }) {
  try {
    const notif = await prisma.notification.create({ data: { userId, type, title, body, refId } });
    io.to(`user:${userId}`).emit('notification', {
      id: notif.id, type, title, body, refId, createdAt: notif.createdAt,
    });
    return notif;
  } catch(e) { /* non-fatal */ }
}
app.set('createNotification', createNotification);

// ── MIDNIGHT TASK RESET ──
function scheduleTaskReset() {
  const now     = new Date();
  const nairobi = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const msToMidnight = (24*60*60*1000)
    - (nairobi.getHours()*3600 + nairobi.getMinutes()*60 + nairobi.getSeconds())*1000
    - nairobi.getMilliseconds();
  setTimeout(async () => {
    try {
      await prisma.appState.upsert({
        where:  { id: 'singleton' },
        update: { tasksResetAt: new Date() },
        create: { id: 'singleton', tasksResetAt: new Date() },
      });
      io.emit('tasks-reset', { resetAt: new Date().toISOString() });
    } catch(e) { console.error('Midnight reset error:', e.message); }
    scheduleTaskReset();
  }, msToMidnight);
}

// ── SPA FALLBACK ──
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// ── START ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SOCS running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  scheduleTaskReset();
});

module.exports = { app, io };
