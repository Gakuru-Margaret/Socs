const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});
const fileFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5*1024*1024 } });

// POST /api/upload/photo — task proof photo
router.post('/photo', authenticate, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { taskId, caption } = req.body;
    const photoUrl = `/uploads/${req.file.filename}`;
    const proof = await prisma.photoProof.create({
      data: { userId: req.user.id, taskId: taskId||null, photoUrl, caption },
    });
    if (taskId) {
      const today = new Date(); today.setHours(0,0,0,0);
      await prisma.taskCompletion.updateMany({
        where: { taskId, userId: req.user.id, taskDate: today },
        data:  { proofPhoto: photoUrl },
      });
    }
    // Notify supervisors
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    const supervisors = await prisma.user.findMany({ where: { role:{ in:['supervisor','assistant'] }, isActive:true } });
    for (const sv of supervisors) {
      await createNotif(prisma, io, sv.id, {
        type:'task', title:`📸 Photo Proof — ${req.user.name}`,
        body:`Uploaded proof${taskId?' for task':''}`, refId: proof.id,
      });
    }
    io.to('supervisors').emit('photo-proof', { userId: req.user.id, name: req.user.name, photoUrl, taskId });
    res.json({ message:'Photo uploaded', photoUrl, proof });
  } catch (err) { res.status(500).json({ error:'Upload failed' }); }
});

// POST /api/upload/avatar — profile photo
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl } });
    res.json({ avatarUrl });
  } catch (err) { res.status(500).json({ error:'Upload failed' }); }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error:'File too large. Max 5MB.' });
  res.status(400).json({ error: err.message });
});
module.exports = router;
