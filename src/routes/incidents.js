const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireSupervisor } = require('../middleware/auth');
const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb) => cb(null, path.join(__dirname,'../../uploads')),
    filename:    (req,file,cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req,file,cb) => {
    if(['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) cb(null,true);
    else cb(new Error('Images only'),false);
  },
  limits: { fileSize: 5*1024*1024 },
});

// GET /api/incidents
router.get('/', authenticate, async (req, res) => {
  try {
    const where = (req.user.role==='supervisor'||req.user.role==='assistant') ? {} : { userId: req.user.id };
    const incidents = await prisma.incident.findMany({
      where, orderBy:{ createdAt:'desc' }, take:50,
      include:{ user:{ select:{ name:true, staffId:true, role:true } } },
    });
    res.json({ incidents });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/incidents — supports optional photo upload
router.post('/', authenticate, upload.single('photo'), async (req, res) => {
  try {
    const { type, location, description, severity } = req.body;
    if (!type||!location||!description) return res.status(400).json({ error:'Missing fields' });
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const incident = await prisma.incident.create({
      data:{ userId:req.user.id, type, location, description, severity:severity||'medium', photoUrl },
    });
    const io = req.app.get('io');
    const createNotif = req.app.get('createNotification');
    const supervisors = await prisma.user.findMany({ where:{ role:{ in:['supervisor','assistant'] }, isActive:true } });
    for (const sv of supervisors) {
      await createNotif(prisma, io, sv.id, {
        type:'incident', title:`🚨 Incident — ${type}`,
        body:`${req.user.name}: ${description.substring(0,60)} at ${location}`, refId:incident.id,
      });
    }
    io.to('supervisors').emit('incident-reported',{ id:incident.id, type, location, reporter:req.user.name, severity:incident.severity, photoUrl });
    res.status(201).json({ incident });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// PATCH /api/incidents/:id/resolve — supervisor resolves
router.patch('/:id/resolve', authenticate, requireSupervisor, async (req, res) => {
  try {
    const inc = await prisma.incident.update({
      where:{ id:req.params.id }, data:{ status:'resolved', resolvedBy:req.user.id, resolvedAt:new Date() },
    });
    res.json({ incident:inc });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
