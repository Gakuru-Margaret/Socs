# SOCS — Setup & Deployment Guide

**Staff Operational Coordination System**
Built by Margaret Gakuru Mukuhi — Zetech University, ICT Department, 2026

---

## What's Included

```
socs/
├── public/                  # Frontend (HTML + CSS + JS)
│   ├── index.html           # Landing page
│   ├── login.html           # Login / auth page
│   ├── dashboard.html       # Staff + Supervisor dashboard
│   ├── css/main.css         # Complete design system
│   ├── js/
│   │   ├── landing.js       # Landing page interactions
│   │   ├── auth.js          # Login logic (with demo fallback)
│   │   └── app.js           # Full dashboard app
│   └── manifest.json        # PWA manifest
├── src/
│   ├── middleware/auth.js   # JWT auth + RBAC
│   └── routes/
│       ├── auth.js          # Login, /me, change-password
│       ├── attendance.js    # Clock-in/out, history, stats
│       ├── tasks.js         # Duty checklist CRUD
│       ├── supplies.js      # Supply request ledger
│       ├── incidents.js     # Incident logger
│       ├── dashboard.js     # Supervisor overview
│       └── upload.js        # Photo proof uploads
├── prisma/
│   ├── schema.prisma        # Database models
│   └── seed.js              # Demo data seeder
├── uploads/                 # Uploaded photos (auto-created)
├── server.js                # Main Express + Socket.IO server
├── package.json
├── .env.example             # ← Copy to .env and fill in values
└── .gitignore
```

---

## Prerequisites

| Tool | Version | How to install |
|------|---------|----------------|
| Node.js | ≥ 18.0 | https://nodejs.org |
| npm | ≥ 9.0 | Comes with Node.js |
| PostgreSQL | ≥ 14 | https://postgresql.org or use Render/Neon (free) |
| Git | any | https://git-scm.com |

---

## Step 1 — Install Dependencies

```bash
# Navigate into the project folder
cd socs

# Install all Node.js packages
npm install
```

---

## Step 2 — Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Open it and fill in your values
nano .env        # Linux/Mac
notepad .env     # Windows
```

### Required variables to change:

| Variable | What to put |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection string (see below) |
| `JWT_SECRET` | A long random string (see generation command below) |

### Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### DATABASE_URL formats:

**Local PostgreSQL:**
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/socs_db
```

**Neon (free cloud PostgreSQL — recommended for deployment):**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/socs_db?sslmode=require
```

**Render PostgreSQL:**
```
DATABASE_URL=postgresql://user:pass@hostname/socs_db?sslmode=require
```

---

## Step 3 — Create the Database

```bash
# First, create the database in PostgreSQL (local only)
psql -U postgres -c "CREATE DATABASE socs_db;"

# Generate Prisma client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Seed with demo data
npm run db:seed
```

### Demo Accounts (created by seed):
| Staff ID | Password | Role |
|----------|----------|------|
| STF-001 | demo123 | Cleaner |
| STF-002 | demo123 | Watchman |
| STF-003 | demo123 | Office Assistant |
| SUP-001 | demo123 | Supervisor |

---

## Step 4 — Run the Server

```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

Open your browser at: **http://localhost:3000**

---

## Step 5 — Test the System

1. Go to **http://localhost:3000** — landing page loads
2. Click **"Sign In to SOCS"** or use demo buttons on login page
3. As **Cleaner (STF-001):** test Clock-In, tick off tasks, report supply shortage
4. As **Supervisor (SUP-001):** see the Overview tab with live staff status
5. Real-time updates via Socket.IO work when multiple browser tabs are open

---

## Production Deployment

### Option A — Render.com (Recommended, Free Tier Available)

1. Push your code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push`
   - **Start Command:** `npm start`
5. Add Environment Variables (from your `.env`)
6. Create a free **Render PostgreSQL** database and copy its `DATABASE_URL`
7. Set `FRONTEND_URL` to your Render app URL (e.g. `https://socs.onrender.com`)

### Option B — Vercel (Frontend) + Render (Backend)

If you want to split:
- Deploy `public/` folder to **Vercel** (frontend)
- Deploy the Node.js server to **Render** (backend)
- Update `FRONTEND_URL` in backend `.env` to your Vercel URL
- Update API base URLs in frontend JS to point to Render backend URL

### Option C — VPS (Ubuntu Server)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql

# Clone and setup project
git clone <your-repo> /var/www/socs
cd /var/www/socs
npm install
cp .env.example .env
# Edit .env with your values
npx prisma generate && npx prisma db push && npm run db:seed

# Install PM2 to keep server running
sudo npm install -g pm2
pm2 start server.js --name socs
pm2 startup && pm2 save

# Optional: Nginx reverse proxy
sudo apt install -y nginx
# Configure nginx to proxy localhost:3000
```

---

## API Reference

All API routes require `Authorization: Bearer <token>` header (except `/api/auth/login` and `/api/health`).

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | All | Login with staffId + password |
| GET | `/api/auth/me` | All | Get current user |
| POST | `/api/auth/change-password` | All | Change password |
| POST | `/api/attendance/clock-in` | Staff | Clock in |
| POST | `/api/attendance/clock-out` | Staff | Clock out |
| GET | `/api/attendance/my` | Staff | Own history |
| GET | `/api/attendance/today` | Supervisor | All staff today |
| GET | `/api/attendance/stats` | Staff | Monthly stats |
| GET | `/api/tasks` | Staff | Today's tasks |
| POST | `/api/tasks/:id/complete` | Staff | Mark task done |
| POST | `/api/tasks/:id/uncomplete` | Staff | Unmark task |
| GET | `/api/supplies` | Staff | Own requests |
| POST | `/api/supplies` | Staff | New request |
| GET | `/api/supplies/all` | Supervisor | All requests |
| PATCH | `/api/supplies/:id/status` | Supervisor | Approve/reject |
| GET | `/api/incidents` | Staff | Own incidents |
| POST | `/api/incidents` | Staff | Log incident |
| GET | `/api/incidents/open` | Supervisor | Open incidents |
| PATCH | `/api/incidents/:id/resolve` | Supervisor | Resolve |
| GET | `/api/dashboard/overview` | Supervisor | Live stats |
| GET | `/api/dashboard/staff-status` | Supervisor | Per-staff view |
| POST | `/api/upload/photo` | Staff | Upload photo proof |

---

## Socket.IO Events

The server emits these real-time events to supervisors:

| Event | Trigger | Payload |
|-------|---------|---------|
| `staff-clocked-in` | Any staff clocks in | `{ userId, name, time }` |
| `staff-clocked-out` | Any staff clocks out | `{ userId, name, time }` |
| `task-completed` | Task ticked off | `{ userId, name, taskId }` |
| `supply-request` | New supply shortage | `{ id, item, urgency, reporter }` |
| `supply-status-updated` | Request approved/rejected | `{ id, status }` |
| `new-incident` | Incident logged | `{ id, type, location, severity }` |

Supervisors join the `supervisors` room by emitting `join-room` with value `"supervisors"`.

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a long random string (never use default)
- [ ] Set `NODE_ENV=production` on server
- [ ] Use HTTPS (handled automatically by Render/Vercel)
- [ ] Change all demo passwords before go-live
- [ ] Review CORS `FRONTEND_URL` setting
- [ ] PostgreSQL: use a non-default user with limited permissions
- [ ] Set up database backups on your hosting provider
- [ ] `uploads/` folder should NOT be in version control

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, Vanilla JS | Mobile-first PWA UI |
| Fonts | Syne, Space Mono, DM Sans | Design system typography |
| Real-time | Socket.IO | Live attendance & alerts |
| Backend | Node.js + Express.js | REST API server |
| Database | PostgreSQL + Prisma ORM | Digital ledger (replaces paper books) |
| Auth | JWT + bcrypt | Secure login, RBAC |
| File Upload | Multer | Photo proof uploads |
| Hosting | Render / Vercel | Cloud deployment |
| Compliance | Kenya Data Protection Act, 2019 | Privacy & data handling |

---

## Troubleshooting

**"Cannot connect to database"**
→ Check `DATABASE_URL` in `.env` — ensure PostgreSQL is running

**"Prisma client not generated"**
→ Run `npx prisma generate`

**Login returns 401 with demo accounts**
→ Run `npm run db:seed` to create demo users

**Socket.IO not connecting**
→ Ensure `FRONTEND_URL` matches exactly where your frontend is served

**Photo upload fails**
→ Ensure the `uploads/` folder exists: `mkdir -p uploads`

**Port 3000 already in use**
→ Change `PORT=3001` in `.env`

---

*SOCS — Staff Operational Coordination System*
*Zetech University — ICT Department — March 2026*
*By Margaret Gakuru Mukuhi*
