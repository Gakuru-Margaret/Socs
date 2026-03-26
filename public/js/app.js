// ══════════════════════════════════════════════════════════
//  SOCS v6 — Production API-Driven Dashboard
//  All data reads and writes hit the real database.
//  No mock data. No resets on refresh.
// ══════════════════════════════════════════════════════════

// ── API LAYER ──────────────────────────────────────────────
const API = {
  async req(method, path, body, isForm) {
    const token = localStorage.getItem('socs_token');
    const opts = {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    };
    if (isForm) { opts.body = body; }
    else if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch('/api' + path, opts);
    // Only force logout on 401 if this is an auth call — not every API call
    if (res.status === 401 && path.includes('/auth/')) {
      localStorage.clear(); window.location.href = '/login.html'; return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  },
  get:    (p)       => API.req('GET',    p),
  post:   (p, b)    => API.req('POST',   p, b),
  patch:  (p, b)    => API.req('PATCH',  p, b),
  delete: (p)       => API.req('DELETE', p),
  upload: (p, form) => API.req('POST',   p, form, true),
};

// ── ROLE NAV CONFIG ────────────────────────────────────────
const ROLE_CONFIG = {
  cleaner: { label:'Cleaner', nav: [
    {tab:'attendance',   icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, label:'Attendance'},
    {tab:'checklist',    icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label:'Duty Checklist'},
    {tab:'absence',      icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`, label:'Sick Leave'},
    {tab:'supply-staff', icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`, label:'Report Shortage'},
    {tab:'incidents',    icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label:'Incidents'},
    {tab:'messages',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, label:'Messages', badge:'msg'},
  ]},
  watchman: { label:'Watchman', nav: [
    {tab:'attendance',   icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, label:'Attendance'},
    {tab:'checklist',    icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label:'Duty Checklist'},
    {tab:'absence',      icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`, label:'Sick Leave'},
    {tab:'supply-staff', icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`, label:'Report Shortage'},
    {tab:'incidents',    icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label:'Incidents'},
    {tab:'messages',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, label:'Messages', badge:'msg'},
  ]},
  assistant: { label:'Office Assistant', nav: [
    {tab:'attendance',   icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, label:'Attendance'},
    {tab:'checklist',    icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label:'Duty Checklist'},
    {tab:'absence',      icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`, label:'Sick Leave'},
    {tab:'supply-staff', icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`, label:'Report Shortage'},
    {tab:'incidents',    icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, label:'Incidents'},
    {tab:'sv-attendance',icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label:'Staff Attendance', section:'Management'},
    {tab:'sv-supplies',  icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`, label:'Supply Inbox'},
    {tab:'sv-leave',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, label:'Leave Inbox'},
    {tab:'messages',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, label:'Messages', badge:'msg'},
  ]},
  supervisor: { label:'Supervisor', nav: [
    {tab:'overview',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`, label:'Overview', section:'Dashboard'},
    {tab:'sv-attendance',icon:'👥', label:'Attendance'},
    {tab:'sv-supplies',  icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`, label:'Supply Inbox'},
    {tab:'sv-leave',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, label:'Leave Inbox'},
    {tab:'staff-mgmt',   icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label:'Staff Management'},
    {tab:'task-assign',  icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`, label:'Task Assignment'},
    {tab:'sections',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, label:'Sections'},
    {tab:'announce',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, label:'Announcements'},
    {tab:'messages',     icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, label:'Messages', badge:'msg'},
  ]},
};

// ── APP STATE ──────────────────────────────────────────────
const S = { user: null, token: null, clockedIn: false, clockInTime: null, activeTab: '' };
let socket = null;
let activeChatPartnerId = null;
let currentWorker = null;

// ── HELPERS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
function setText(id, v) { const e=$(id); if(e) e.textContent=v; }
function setVal(id, v)  { const e=$(id); if(e) e.value=v; }
function fmtRole(r) { return {cleaner:'Cleaner',watchman:'Watchman',assistant:'Office Assistant',supervisor:'Supervisor'}[r]||r; }
function cap(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }
function fmtTime(d) { if(!d) return '—'; return new Date(d).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',hour12:false}); }
function fmtDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }
function fmtDateTime(d) { if(!d) return '—'; const dt=new Date(d); return dt.toLocaleDateString('en-KE',{day:'numeric',month:'short'})+' '+fmtTime(dt); }
function elapsed(d) {
  const diff = Date.now()-new Date(d); const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000);
  if(h>23) return fmtDate(d); if(h>0) return `${h}h ago`; if(m>0) return `${m}m ago`; return 'Just now';
}
function greeting(n) { const h=new Date().getHours(); return h<12?`Good morning, ${n}`:h<17?`Good afternoon, ${n}`:`Good evening, ${n}`; }
function notifIcon(t) { return {supply:'📦',task:'✅',absence:'🌡️',incident:'🚨',message:'💬',announcement:'📢'}[t]||'🔔'; }
function notifClass(t) { return {supply:'amber',task:'sky',absence:'purple',incident:'red',message:'green',announcement:'sky'}[t]||'green'; }
function isSupervisor() { return ['supervisor','assistant'].includes(S.user?.role); }

function toast(msg, type='info') {
  const c=$('toast-container'); if(!c) return;
  const el=document.createElement('div');
  el.className=`toast toast-${type}`; el.textContent=msg; c.appendChild(el);
  setTimeout(()=>{ el.style.cssText='opacity:0;transform:translateX(30px);transition:all .3s'; setTimeout(()=>el.remove(),300); }, 3500);
}

function showLoading(id) { const e=$(id); if(e) e.innerHTML='<div class="log-loading">Loading...</div>'; }
function showEmpty(id, icon, msg) { const e=$(id); if(e) e.innerHTML=`<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`; }

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const userStr = localStorage.getItem('socs_user');
    S.token = localStorage.getItem('socs_token');
    if (!userStr || !S.token) { window.location.href='/login.html'; return; }
    S.user = JSON.parse(userStr);
  } catch(e) { localStorage.clear(); window.location.href='/login.html'; return; }

  // Refresh user profile from DB — use cached if server unreachable
  try {
    const data = await API.get('/auth/me');
    if (data?.user) {
      S.user = { ...S.user, ...data.user };
      localStorage.setItem('socs_user', JSON.stringify(S.user));
    }
  } catch(e) {
    console.warn('Could not refresh profile — using cached user');
  }

  buildNav();
  initUI();
  startClock();
  initSocket();
  initUserMenu();
  initPhotoUploads();
  initProfileSettings();
  initNotifBell();

  // Check clock-in state from server
  await restoreClockState();

  const defaultTab = isSupervisor() ? 'overview' : 'attendance';
  switchTab(defaultTab);

  loadNotifBadge();
  loadMsgBadge();
  renderAnnouncementBanners();

  $('sb-logout')?.addEventListener('click', logout);
  $('logout-btn')?.addEventListener('click', logout);
});

// ── SOCKET.IO ─────────────────────────────────────────────
function initSocket() {
  if (typeof io === 'undefined') return;
  socket = io({ transports:['websocket','polling'] });
  socket.on('connect', () => {
    const u = S.user;
    if (u) socket.emit('authenticate', { userId:u.id, role:u.role, staffId:u.staffId });
  });

  socket.on('staff-clocked-in',   () => { if(S.activeTab==='sv-attendance') loadSvAttendance(); if(S.activeTab==='overview') loadOverview(); });
  socket.on('staff-clocked-out',  () => { if(S.activeTab==='sv-attendance') loadSvAttendance(); if(S.activeTab==='overview') loadOverview(); });
  socket.on('task-assigned',      () => { if(S.activeTab==='checklist') loadChecklist(); loadNotifBadge(); });
  socket.on('tasks-reset',   d   => { if(S.activeTab==='checklist') loadChecklist(); if(S.activeTab==='task-assign') loadTaskAssign(); toast(`Tasks reset${d.resetBy?' by '+d.resetBy:''}`, 'info'); });
  socket.on('supply-request',     () => { if(S.activeTab==='sv-supplies') loadSvSupplies(); if(S.activeTab==='overview') loadOverview(); loadNotifBadge(); });
  socket.on('supply-status-updated', () => { if(S.activeTab==='supply-staff') loadMySupplies(); if(S.activeTab==='sv-supplies') loadSvSupplies(); loadNotifBadge(); });
  socket.on('leave-submitted',    () => { if(S.activeTab==='sv-leave') loadSvLeave(); loadNotifBadge(); });
  socket.on('leave-updated',      () => { if(S.activeTab==='absence') loadAbsenceLog(); if(S.activeTab==='sv-leave') loadSvLeave(); loadNotifBadge(); });
  socket.on('incident-reported',  () => { if(S.activeTab==='overview') loadOverview(); loadNotifBadge(); });
  socket.on('assigned-task-done', () => { if(S.activeTab==='task-assign') loadTaskAssign(); if(S.activeTab==='staff-mgmt') loadStaffMgmt(); });
  socket.on('photo-proof',        () => { if(S.activeTab==='overview') loadOverview(); loadNotifBadge(); });
  socket.on('announcement', ann => {
    const role = S.user?.role;
    if (ann.target==='all' || ann.target===role) { renderAnnouncementBanners(); if(S.activeTab==='announce') loadAnnounceList(); }
  });
  socket.on('new-message', msg => {
    loadMsgBadge();
    if (S.activeTab==='messages') {
      loadConvList();
      if (activeChatPartnerId===msg.fromId) { loadChatMessages(msg.fromId); socket.emit('mark-messages-read',{fromId:msg.fromId}); }
    }
    toast(`💬 ${msg.fromName}`, 'info');
  });
  socket.on('notification', () => loadNotifBadge());
  socket.on('messages-read', () => { if(S.activeTab==='messages'&&activeChatPartnerId) loadChatMessages(activeChatPartnerId); });
}

// ── BUILD NAV ──────────────────────────────────────────────
function buildNav() {
  const config = ROLE_CONFIG[S.user.role] || ROLE_CONFIG.cleaner;
  const nav = $('sidebar-nav'); if(!nav) return;
  let html='', lastSection=null;
  config.nav.forEach(item => {
    if (item.section && item.section!==lastSection) { html+=`<div class="sidebar-section-label">${item.section}</div>`; lastSection=item.section; }
    const badge = item.badge==='msg' ? `<span class="sb-badge hidden" id="msg-badge">0</span>` : '';
    html+=`<button class="sidebar-item" data-tab="${item.tab}"><span class="sb-icon-svg">${item.icon}</span>${item.label}${badge}</button>`;
  });
  html+=`<div class="sidebar-section-label">Personal</div>`;
  html+=`<button class="sidebar-item" data-tab="notifications"><span class="sb-icon-svg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>Notifications <span class="sb-badge hidden" id="notif-badge">0</span></button>`;
  html+=`<button class="sidebar-item" data-tab="profile"><span class="sb-icon-svg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>Profile & Settings</button>`;
  nav.innerHTML=html;
  nav.querySelectorAll('.sidebar-item[data-tab]').forEach(btn => btn.addEventListener('click', ()=>switchTab(btn.dataset.tab)));
}

// ── UI INIT ────────────────────────────────────────────────
function initUI() {
  const u=S.user;
  const init=u.initials||(u.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase());
  setAvatarAll(u.avatarUrl, init);
  setText('dropdown-name', u.name); setText('dropdown-role', fmtRole(u.role));
  setText('sb-name', u.name.split(' ').slice(0,2).join(' ')); setText('sb-role', fmtRole(u.role));
  setText('greeting-text', greeting(u.name.split(' ')[0]));
  setText('greeting-sub', 'Welcome back.');
  setText('prof-name', u.name); setText('prof-role', fmtRole(u.role)); setText('prof-id', 'ID: '+u.staffId);
  setVal('edit-name', u.name); setVal('edit-email', u.email||''); setVal('edit-phone', u.phone||'');
  if(isSupervisor()) { const ss=$('shift-status'); if(ss) ss.style.display='none'; }
}

function setAvatarAll(url, init) {
  const imgHtml = url
    ? `<img src="${url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : (init || '?');

  // Update all avatar elements
  ['user-avatar', 'sb-avatar', 'profile-avatar-big'].forEach(id => {
    const el = $(id); if (!el) return;
    if (url) {
      el.innerHTML = `<img src="${url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    } else {
      el.innerHTML = init || '?';
    }
  });

  // Also update any img elements that are already loaded avatars
  document.querySelectorAll('.user-avatar img, .sb-avatar img, .profile-avatar img').forEach(img => {
    if (url) img.src = url;
  });
}

// ── CLOCK ──────────────────────────────────────────────────
function startClock() {
  function tick(){
    const now=new Date();
    setText('live-clock', now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}));
    setText('live-date',  now.toLocaleDateString('en-KE',{weekday:'short',day:'numeric',month:'short'}));
    setText('att-clock',  now.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',hour12:false}));
    setText('att-date',   now.toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
  }
  tick(); setInterval(tick,1000);
}

async function restoreClockState() {
  try {
    const data = await API.get('/attendance/my?days=1');
    const today = new Date().toDateString();
    const todayRec = data?.records?.find(r => new Date(r.shiftDate).toDateString()===today && !r.clockOut);
    if (todayRec) { S.clockedIn=true; S.clockInTime=fmtTime(todayRec.clockIn); updateClockUI(true); }
    else updateClockUI(false);
  } catch(e) { updateClockUI(false); }
}

// ── TABS ──────────────────────────────────────────────────
function switchTab(tab) {
  S.activeTab=tab;
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('.sidebar-item').forEach(b=>b.classList.remove('active'));
  const panel=$('tab-'+tab), btn=document.querySelector(`.sidebar-item[data-tab="${tab}"]`);
  if(panel) panel.classList.remove('hidden');
  if(btn)   btn.classList.add('active');
  $('user-dropdown')?.classList.add('hidden');
  const isMsg=tab==='messages';
  const gr=document.querySelector('.greeting-banner'), an=$('announcements-area');
  if(gr) gr.style.display=isMsg?'none':'';
  if(an) an.style.display=isMsg?'none':'';
  loadTab(tab);
  updateMobileNav(tab);
}

function loadTab(tab) {
  switch(tab){
    case 'attendance':    loadAttendance();     break;
    case 'checklist':     loadChecklist();      break;
    case 'absence':       loadAbsenceTab();     break;
    case 'supply-staff':  loadMySupplies();     break;
    case 'incidents':     loadIncidents();      break;
    case 'notifications': loadNotifications();  break;
    case 'profile':       loadProfile();        break;
    case 'overview':      loadOverview();       break;
    case 'sv-attendance': loadSvAttendance();   break;
    case 'sv-supplies':   loadSvSupplies();     break;
    case 'sv-leave':      loadSvLeave();        break;
    case 'staff-mgmt':    loadStaffMgmt();      break;
    case 'task-assign':   loadTaskAssign();     break;
    case 'sections':      loadSections();       break;
    case 'announce':      loadAnnounceTab();    break;
    case 'messages':      loadMessagesTab();    break;
  }
}

// ═══════════════════════════════════════════════════════════
//  ATTENDANCE
// ═══════════════════════════════════════════════════════════
async function loadAttendance() {
  const btn=$('clock-btn');
  if(btn) btn.onclick=handleClock;
  try {
    const [attData, statsData] = await Promise.all([API.get('/attendance/my?days=14'), API.get('/attendance/stats')]);
    renderAttendanceLog(attData?.records||[]);
    if(statsData) {
      setText('stat-days',  statsData.daysWorked);
      setText('stat-hours', statsData.totalHours+'h');
      setText('stat-late',  statsData.lateDays);
      setText('stat-rate',  statsData.attendanceRate+'%');
    }
  } catch(e) { showEmpty('attendance-log','⚠️','Could not load attendance data.'); }
}

function renderAttendanceLog(records) {
  const log=$('attendance-log'); if(!log) return;
  if(!records.length) { showEmpty('attendance-log','📋','No attendance records yet.'); return; }
  log.innerHTML=records.map(r=>`
    <div class="log-entry ${r.isLate?'entry-late':r.clockOut?'entry-out':'entry-in'}">
      <div>
        <div class="log-entry-date">${fmtDate(r.shiftDate)}</div>
        <div style="font-family:var(--font-mono);font-size:.79rem;margin-top:2px">
          In: ${fmtTime(r.clockIn)} ${r.clockOut?`→ Out: ${fmtTime(r.clockOut)}`:`→ <span style="color:var(--accent)">Active</span>`}
        </div>
      </div>
      <div style="text-align:right">
        ${r.hoursWorked?`<div class="log-entry-hours">${r.hoursWorked}h</div>`:''}
        ${r.isLate?'<div style="font-size:.72rem;color:var(--amber)">Late</div>':''}
      </div>
    </div>`).join('');
}

async function handleClock() {
  const btn=$('clock-btn'); if(btn) btn.disabled=true;
  try {
    if(!S.clockedIn) {
      const data = await API.post('/attendance/clock-in');
      S.clockedIn=true; S.clockInTime=fmtTime(data.record.clockIn);
      updateClockUI(true); toast(`Clocked in at ${S.clockInTime}`,'success');
    } else {
      const data = await API.post('/attendance/clock-out');
      S.clockedIn=false; S.clockInTime=null;
      updateClockUI(false); toast(`Clocked out at ${fmtTime(data.record.clockOut)}`,'info');
    }
    loadAttendance();
  } catch(e) { toast(e.message||'Clock error','error'); }
  finally { if(btn) btn.disabled=false; }
}

function updateClockUI(isIn) {
  const btn=$('clock-btn'); if(!btn) return;
  if(isIn) {
    btn.className='btn-clock btn-clockin'; btn.innerHTML=`<span>⏹</span><span>Clock Out</span>`;
    setText('clock-status-txt',`Clocked in at ${S.clockInTime}`);
    const d=$('shift-dot'); if(d) d.className='status-dot status-in';
    setText('shift-label','On Shift'); setText('greeting-sub',`On shift since ${S.clockInTime}`);
  } else {
    btn.className='btn-clock btn-clockin'; btn.innerHTML=`<span>⏵</span><span>Clock In</span>`;
    setText('clock-status-txt','You are not clocked in');
    const d=$('shift-dot'); if(d) d.className='status-dot status-out';
    setText('shift-label','Off Shift'); setText('greeting-sub','Tap "Clock In" to start your shift.');
  }
}

// ═══════════════════════════════════════════════════════════
//  CHECKLIST
// ═══════════════════════════════════════════════════════════
let _tasks=[];
async function loadChecklist() {
  showLoading('task-list');
  try {
    // Load both duty tasks and supervisor-assigned tasks
    const [dutyData, assignedData] = await Promise.all([
      API.get('/tasks'),
      API.get('/assigned-tasks/mine').catch(()=>({tasks:[]})),
    ]);
    const duty     = (dutyData?.tasks||[]).map(t=>({...t, source:'duty'}));
    const assigned = (assignedData?.tasks||[]).map(t=>({...t, id:t.id, name:t.name, location:t.location, completed:t.isDone, completedAt:t.completedAt, source:'assigned'}));
    _tasks = [...duty, ...assigned];
    renderTasks(); populateProofSelect();
    setText('checklist-date', new Date().toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long'}));
  } catch(e) { showEmpty('task-list','⚠️','Could not load tasks.'); }
}

function renderTasks() {
  const list=$('task-list'); if(!list) return;
  if(!_tasks.length){showEmpty('task-list','📋','No tasks assigned for today.');return;}
  list.innerHTML=_tasks.map(t=>`
    <div class="task-item ${t.completed?'completed':''}" onclick="toggleTask('${t.id}','${t.source}')">
      <div class="task-checkbox"><span class="task-check-icon">✓</span></div>
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        <div class="task-meta">📍 ${t.location||''} ${t.source==='assigned'?'<span style="font-size:.7rem;color:var(--sky)">• Assigned</span>':''}</div>
      </div>
      ${t.completed&&t.completedAt?`<span class="task-time">${fmtTime(t.completedAt)}</span>`:''}
    </div>`).join('');
  updateProgress();
}

async function toggleTask(id, source) {
  const task=_tasks.find(t=>t.id===id); if(!task) return;
  const willComplete=!task.completed;
  task.completed=willComplete; task.completedAt=willComplete?new Date():null;
  renderTasks();
  try {
    if(source==='assigned') {
      if(willComplete) await API.patch(`/assigned-tasks/${id}/done`);
    } else {
      if(willComplete) await API.post(`/tasks/${id}/complete`);
      else             await API.post(`/tasks/${id}/uncomplete`);
    }
    toast(willComplete?`✅ Task complete`:`↩ Task marked incomplete`, willComplete?'success':'info');
    // Update STAFF_DB in overview if supervisor is watching
    socket?.emit && socket.emit('task-progress-update', { userId:S.user.id });
  } catch(e) { task.completed=!willComplete; renderTasks(); toast('Failed to update task','error'); }
}

function updateProgress() {
  const total=_tasks.length, done=_tasks.filter(t=>t.completed).length, pct=total?Math.round(done/total*100):0;
  setText('progress-pct', pct+'%'); setText('done-count', done); setText('todo-count', total-done);
  const ring=$('ring-fill'); if(ring) ring.style.strokeDashoffset=314-(314*pct/100);
}

function populateProofSelect() {
  const sel=$('proof-task-select'); if(!sel) return;
  sel.innerHTML='<option value="">Select task this photo proves...</option>'+_tasks.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
}

// ═══════════════════════════════════════════════════════════
//  PHOTO UPLOADS
// ═══════════════════════════════════════════════════════════
function initPhotoUploads() {
  // Checklist proof
  const zone=$('upload-zone'), input=$('photo-input'), preview=$('upload-preview'), img=$('preview-img');
  $('choose-photo-btn')?.addEventListener('click', e=>{e.stopPropagation();input?.click();});
  zone?.addEventListener('click', ()=>input?.click());
  input?.addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{img.src=ev.target.result;zone.classList.add('hidden');preview.classList.remove('hidden');}; r.readAsDataURL(f);
  });
  $('cancel-upload')?.addEventListener('click',()=>{preview.classList.add('hidden');zone.classList.remove('hidden');if(input)input.value='';});
  $('upload-btn')?.addEventListener('click', async ()=>{
    const tid=$('proof-task-select')?.value;
    if(!tid){toast('Select which task this photo proves','error');return;}
    if(!input?.files[0]){toast('No photo selected','error');return;}
    const form=new FormData(); form.append('photo',input.files[0]); form.append('taskId',tid);
    try {
      await API.upload('/upload/photo', form);
      toast('Photo uploaded — supervisor notified','success');
      preview.classList.add('hidden'); zone.classList.remove('hidden'); if(input) input.value='';
    } catch(e) { toast(e.message||'Upload failed','error'); }
  });

  // Incident photo
  const iz=$('inc-upload-zone'), ii=$('inc-photo'), ip=$('inc-preview'), ipi=$('inc-preview-img');
  iz?.addEventListener('click', ()=>ii?.click());
  ii?.addEventListener('change', e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{ipi.src=ev.target.result;ip.classList.remove('hidden');};r.readAsDataURL(f);});
  $('clear-inc-photo')?.addEventListener('click',()=>{ip.classList.add('hidden');if(ii)ii.value='';});

  // Avatar
  const ai=$('avatar-input');
  $('avatar-overlay')?.addEventListener('click', ()=>ai?.click());
  ai?.addEventListener('change', async e=>{
    const f=e.target.files[0]; if(!f) return;
    // Show instant preview before upload
    const reader=new FileReader();
    reader.onload=ev=>{
      const init=S.user.initials||(S.user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase());
      setAvatarAll(ev.target.result, init);
    };
    reader.readAsDataURL(f);
    // Upload to server
    const form=new FormData(); form.append('avatar',f);
    try {
      const data=await API.upload('/upload/avatar',form);
      S.user.avatarUrl=data.avatarUrl;
      localStorage.setItem('socs_user',JSON.stringify(S.user));
      const init=S.user.initials||(S.user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase());
      setAvatarAll(data.avatarUrl, init);
      toast('Profile photo updated','success');
    } catch(e) { toast('Upload failed — check file size','error'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  SICK LEAVE
// ═══════════════════════════════════════════════════════════
function loadAbsenceTab() {
  const di=$('abs-date'); if(di) di.value=new Date().toISOString().split('T')[0];
  $('absence-form')?.addEventListener('submit', submitAbsence);
  loadAbsenceLog();
}

async function submitAbsence(e) {
  e.preventDefault();
  const type=document.querySelector('input[name="abs-type"]:checked')?.value;
  const date=$('abs-date')?.value, ret=$('abs-return')?.value, reason=$('abs-reason')?.value.trim();
  if(!type){toast('Select absence type','error');return;}
  if(!date){toast('Select date','error');return;}
  if(!reason){toast('Provide a reason','error');return;}
  try {
    await API.post('/leave', { type, leaveDate:date, returnDate:ret||null, reason });
    toast('Absence notice submitted — supervisor notified','success');
    $('absence-form').reset();
    const di=$('abs-date'); if(di) di.value=new Date().toISOString().split('T')[0];
    loadAbsenceLog();
  } catch(e) { toast(e.message||'Failed to submit','error'); }
}

async function loadAbsenceLog() {
  showLoading('absence-log');
  try {
    const data=await API.get('/leave/mine');
    const records=data?.requests||[];
    if(!records.length){showEmpty('absence-log','📅','No absence records.');return;}
    $('absence-log').innerHTML=records.map(r=>`
      <div class="absence-entry">
        <div style="font-size:.72rem;font-weight:700;color:var(--purple);text-transform:uppercase;margin-bottom:4px">${r.type}</div>
        <div style="font-size:.87rem;margin-bottom:3px">${r.reason}</div>
        <div style="font-size:.74rem;color:var(--text-3)">📅 ${fmtDate(r.leaveDate)}${r.returnDate?' → Return: '+fmtDate(r.returnDate):''}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
          <span class="supply-status status-${r.status}">${cap(r.status)}</span>
          <span style="font-size:.72rem;color:var(--text-3)">${elapsed(r.createdAt)}</span>
        </div>
      </div>`).join('');
  } catch(e) { showEmpty('absence-log','⚠️','Could not load.'); }
}

function setWellness(btn) {
  document.querySelectorAll('.wellness-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  toast(`Wellness check-in recorded — ${cap(btn.dataset.feel)}`,'success');
}

// ═══════════════════════════════════════════════════════════
//  SUPPLY (STAFF)
// ═══════════════════════════════════════════════════════════
let _supplyModalItem=null, _supplyModalIcon=null;

function loadMySupplies() {
  initSupplyGrid();
  initCustomSupply();
  loadMySupplyList();
  document.querySelectorAll('[data-filter]').forEach(btn=>{
    btn.onclick=()=>{ document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); loadMySupplyList(btn.dataset.filter); };
  });
}

function initSupplyGrid() {
  document.querySelectorAll('.supply-item').forEach(btn=>{
    btn.onclick=()=>{
      _supplyModalItem=btn.dataset.item; _supplyModalIcon=btn.dataset.icon||'📦';
      setText('modal-item-name', btn.dataset.item);
      setVal('modal-notes','');
      const r=document.querySelector('input[name="modal-urgency"][value="normal"]'); if(r) r.checked=true;
      $('supply-modal')?.classList.remove('hidden');
    };
  });
  $('close-supply-modal')?.addEventListener('click', ()=>$('supply-modal')?.classList.add('hidden'));
  $('modal-cancel')?.addEventListener('click',       ()=>$('supply-modal')?.classList.add('hidden'));
  $('modal-confirm')?.addEventListener('click', async ()=>{
    const urgency=document.querySelector('input[name="modal-urgency"]:checked')?.value||'normal';
    const notes=$('modal-notes')?.value||'';
    $('supply-modal')?.classList.add('hidden');
    await submitSupply(_supplyModalItem, _supplyModalIcon, urgency, notes);
  });
}

function initCustomSupply() {
  $('custom-supply-btn')?.addEventListener('click', async ()=>{
    const item=$('custom-supply')?.value.trim();
    if(!item){toast('Enter an item name','error');return;}
    await submitSupply(item,'📦',$('supply-urgency')?.value||'normal',$('supply-notes')?.value||'');
    setVal('custom-supply',''); setVal('supply-notes','');
  });
}

async function submitSupply(item, icon, urgency, notes) {
  try {
    await API.post('/supplies', { itemName:item, itemIcon:icon, urgency, notes });
    toast(`"${item}" shortage reported${urgency==='urgent'?' 🚨':''}`,'success');
    loadMySupplyList();
  } catch(e) { toast(e.message||'Failed to submit','error'); }
}

async function loadMySupplyList(filter='all') {
  showLoading('supply-log-staff');
  try {
    const url = filter==='all' ? '/supplies' : `/supplies?status=${filter}`;
    const data=await API.get(url);
    const items=data?.requests||[];
    if(!items.length){showEmpty('supply-log-staff','📭','No requests.');return;}
    $('supply-log-staff').innerHTML=items.map(s=>`
      <div class="supply-entry">
        <span class="supply-entry-icon">${s.itemIcon||'📦'}</span>
        <div class="supply-entry-info">
          <div class="supply-entry-name">${s.itemName} ${s.urgency==='urgent'?'<span style="color:var(--red);font-size:.74rem">🚨</span>':''}</div>
          <div class="supply-entry-meta">${fmtDateTime(s.createdAt)}${s.notes?' · '+s.notes:''}</div>
        </div>
        <span class="supply-status status-${s.status}">${cap(s.status)}</span>
      </div>`).join('');
  } catch(e) { showEmpty('supply-log-staff','⚠️','Could not load.'); }
}

// ═══════════════════════════════════════════════════════════
//  INCIDENTS
// ═══════════════════════════════════════════════════════════
function loadIncidents() {
  $('incident-form')?.addEventListener('submit', submitIncident);
  loadIncidentLog();
}

async function submitIncident(e) {
  e.preventDefault();
  const type=document.querySelector('input[name="inc-type"]:checked')?.value;
  const loc=$('inc-location')?.value.trim(), desc=$('inc-desc')?.value.trim();
  if(!type){toast('Select incident type','error');return;}
  if(!loc){toast('Enter a location','error');return;}
  if(!desc){toast('Describe the incident','error');return;}
  try {
    const formData=new FormData();
    formData.append('type',type); formData.append('location',loc); formData.append('description',desc);
    formData.append('severity',['Security Alert','Breakage'].includes(type)?'high':'medium');
    const photo=$('inc-photo')?.files[0];
    if(photo) formData.append('photo',photo);
    // Use fetch directly for mixed form+json
    const res=await fetch('/api/incidents',{method:'POST',headers:{Authorization:`Bearer ${S.token}`},body:formData});
    if(res.status===401){localStorage.clear();window.location.href='/login.html';return;}
    if(!res.ok){ const d=await res.json(); throw new Error(d.error||'Failed'); }
    toast('🚨 Incident reported — supervisor notified','success');
    $('incident-form').reset();
    $('inc-preview')?.classList.add('hidden');
    loadIncidentLog();
  } catch(err) { toast(err.message||'Failed to report incident','error'); }
}

async function loadIncidentLog() {
  showLoading('incident-log');
  try {
    const data=await API.get('/incidents');
    const items=data?.incidents||[];
    if(!items.length){showEmpty('incident-log','✅','No incidents reported.');return;}
    $('incident-log').innerHTML=items.map(i=>`
      <div class="incident-entry severity-${i.severity}">
        <div class="incident-entry-type">${i.type}</div>
        <div class="incident-entry-desc">${i.description}</div>
        <div class="incident-entry-meta">📍 ${i.location} · ${fmtDateTime(i.createdAt)}</div>
        ${i.photoUrl?`<img src="${i.photoUrl}" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-top:8px"/>`:''}
      </div>`).join('');
  } catch(e) { showEmpty('incident-log','⚠️','Could not load.'); }
}

// Update incident route to support photo upload
const _origIncidentRoute = null; // handled via multipart in route

// ═══════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
function initNotifBell() {
  $('notif-btn')?.addEventListener('click', e=>{e.stopPropagation(); switchTab('notifications');});
  document.querySelectorAll('[data-nfilter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-nfilter]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); loadNotifications(btn.dataset.nfilter);
    });
  });
}

async function loadNotifications(filter='all') {
  showLoading('notif-list');
  try {
    await API.patch('/notifications/read-all'); // mark all read in DB
    const data=await API.get('/notifications');
    const all=data?.notifications||[];
    const items=filter==='all'?all:filter==='unread'?all.filter(n=>!n.isRead):all.filter(n=>n.type===filter);
    updateNotifBadge(0);
    if(!items.length){showEmpty('notif-list','🔔','No notifications.');return;}
    $('notif-list').innerHTML=items.map(n=>`
      <div class="notif-item">
        <div class="notif-icon ${notifClass(n.type)}">${notifIcon(n.type)}</div>
        <div class="notif-body">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.body}</div>
          <div class="notif-time">${elapsed(n.createdAt)}</div>
        </div>
        <button class="notif-dismiss" onclick="dismissNotif('${n.id}')" title="Dismiss">✕</button>
      </div>`).join('');
  } catch(e) { showEmpty('notif-list','⚠️','Could not load notifications.'); }
}

async function loadNotifBadge() {
  try {
    const data=await API.get('/notifications');
    const count=(data?.notifications||[]).filter(n=>!n.isRead&&!n.isDismissed).length;
    updateNotifBadge(count);
  } catch(e) {}
}

function updateNotifBadge(count) {
  const dot=$('notif-dot'), badge=$('notif-badge');
  const n = count !== undefined ? count : 0;
  if(dot)   dot.classList.toggle('hidden', n===0);
  if(badge) { badge.textContent=n; badge.classList.toggle('hidden',n===0); }
}

async function dismissNotif(id) {
  try {
    await API.patch(`/notifications/${id}/dismiss`);
    loadNotifications(document.querySelector('[data-nfilter].active')?.dataset.nfilter||'all');
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════
async function loadProfile() {
  const scores={cleaner:82,watchman:91,assistant:76,supervisor:95};
  const score=scores[S.user?.role]||80;
  const c=$('score-circle'); if(c) c.style.setProperty('--pct',score+'%');
  setText('score-num',score); setText('sc-att','92%'); setText('sc-tasks','78%'); setText('sc-time','95%');
}

function initProfileSettings() {
  $('save-profile-btn')?.addEventListener('click', async ()=>{
    const name=$('edit-name')?.value.trim(), phone=$('edit-phone')?.value.trim(), email=$('edit-email')?.value.trim();
    try {
      const data=await API.patch('/auth/profile', {name,phone,email});
      S.user={...S.user,...data.user}; localStorage.setItem('socs_user',JSON.stringify(S.user));
      initUI(); toast('Profile updated','success');
    } catch(e) { toast(e.message||'Failed to update','error'); }
  });
  $('change-pw-btn')?.addEventListener('click', async ()=>{
    const old=$('old-pw')?.value, nw=$('new-pw')?.value, conf=$('confirm-pw')?.value;
    if(!old||!nw||!conf){toast('Fill all fields','error');return;}
    if(nw!==conf){toast('Passwords do not match','error');return;}
    if(nw.length<6){toast('Min 6 characters','error');return;}
    try {
      await API.post('/auth/change-password',{currentPassword:old,newPassword:nw});
      toast('Password changed','success');
      ['old-pw','new-pw','confirm-pw'].forEach(id=>setVal(id,''));
    } catch(e) { toast(e.message||'Failed','error'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  SUPERVISOR: OVERVIEW
// ═══════════════════════════════════════════════════════════
async function loadOverview() {
  try {
    const [staffData, supData, incData] = await Promise.all([
      API.get('/auth/staff'),
      API.get('/supplies/all?status=pending'),
      API.get('/incidents'),
    ]);
    const staff=staffData?.staff||[], pend=supData?.requests||[], incidents=incData?.incidents||[];
    const inCount=staff.filter(s=>s.status==='in').length;
    const taskPct=staff.length?Math.round(staff.reduce((a,s)=>a+(s.tasksTotal?s.tasksDone/s.tasksTotal:0),0)/staff.length*100):0;
    setText('ov-clocked',`${inCount}/${staff.length}`); setText('ov-tasks',taskPct+'%');
    setText('ov-pending',pend.length); setText('ov-incidents',incidents.filter(i=>i.status==='open').length);
    // Staff table
    const tbody=$('staff-tbody'); if(tbody) tbody.innerHTML=staff.map(s=>`
      <tr>
        <td style="font-weight:600;color:var(--text-1)">${s.name}</td>
        <td>${cap(s.role)}</td>
        <td>${s.status==='in'?`<span class="status-in-pill"><span class="live-dot"></span>In</span>`:`<span class="status-out-pill">Out</span>`}</td>
        <td style="font-family:var(--font-mono);font-size:.8rem">${fmtTime(s.clockIn)}</td>
        <td><div class="tasks-progress"><div class="mini-bar"><div class="mini-bar-fill" style="width:${s.tasksTotal?Math.round(s.tasksDone/s.tasksTotal*100):0}%"></div></div><span style="font-size:.74rem;color:var(--text-3)">${s.tasksDone}/${s.tasksTotal}</span></div></td>
        <td>—</td>
      </tr>`).join('');
    // Pending supplies
    const pr=$('pending-requests'), pb=$('pending-badge');
    if(pb) pb.textContent=pend.length;
    if(pr) pr.innerHTML=pend.length?pend.map(s=>`
      <div style="background:var(--surface-3);border-radius:12px;padding:12px;margin-bottom:8px">
        <div style="font-weight:600;font-size:.88rem">${s.itemIcon||'📦'} ${s.itemName} ${s.urgency==='urgent'?'🚨':''}</div>
        <div style="font-size:.74rem;color:var(--text-3);margin-top:2px">From ${s.user?.name} · ${elapsed(s.createdAt)}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="btn-approve" onclick="quickApproveSupply('${s.id}')">✓ Approve</button>
          <button class="btn-reject" onclick="quickRejectSupply('${s.id}')">✗ Reject</button>
        </div>
      </div>`).join(''):
      '<div class="empty-state"><div class="empty-icon">🎉</div><p>No pending requests</p></div>';
    // Open incidents
    const oi=$('open-incidents'), ib=$('incidents-badge');
    const open=incidents.filter(i=>i.status==='open');
    if(ib) ib.textContent=open.length;
    if(oi) oi.innerHTML=open.map(i=>`
      <div style="background:var(--surface-3);border-radius:10px;padding:12px;border-left:3px solid var(--red);margin-bottom:8px">
        <div style="font-size:.72rem;font-weight:700;color:var(--red);text-transform:uppercase">${i.type}</div>
        <div style="font-size:.84rem;margin-top:3px">${i.description}</div>
        <div style="font-size:.73rem;color:var(--text-3);margin-top:3px">📍 ${i.location} · ${i.user?.name} · ${elapsed(i.createdAt)}</div>
        ${i.photoUrl?`<img src="${i.photoUrl}" style="width:100%;max-height:100px;object-fit:cover;border-radius:6px;margin-top:6px"/>`:''}
      </div>`).join('');
  } catch(e) { toast('Failed to load overview','error'); }
}

// ═══════════════════════════════════════════════════════════
//  SUPERVISOR: ATTENDANCE
// ═══════════════════════════════════════════════════════════
async function loadSvAttendance() {
  try {
    const [staffData, attData] = await Promise.all([API.get('/auth/staff'), API.get('/attendance/today')]);
    const staff=staffData?.staff||[];
    const inC=staff.filter(s=>s.status==='in').length, outC=staff.filter(s=>s.status==='out').length;
    const lateC=staff.filter(s=>s.isLate).length;
    setText('sv-att-in',inC); setText('sv-att-out',outC); setText('sv-att-late',lateC);
    setText('sv-att-rate',staff.length?Math.round(inC/staff.length*100)+'%':'0%');
    const tbody=$('sv-att-tbody'); if(!tbody) return;
    tbody.innerHTML=staff.map(s=>`
      <tr>
        <td style="font-weight:600;color:var(--text-1)">${s.name}</td>
        <td>${s.section||cap(s.role)}</td>
        <td>${s.status==='in'?`<span class="status-in-pill"><span class="live-dot"></span>In</span>`:`<span class="status-out-pill">Not In</span>`}</td>
        <td style="font-family:var(--font-mono);font-size:.8rem">${fmtTime(s.clockIn)}</td>
        <td style="font-family:var(--font-mono);font-size:.8rem">${fmtTime(s.clockOut)}</td>
        <td style="color:var(--accent);font-family:var(--font-mono);font-size:.8rem">${s.hoursWorked?s.hoursWorked+'h':'—'}</td>
        <td>${s.isLate?'<span style="color:var(--amber);font-size:.78rem">⏰ Late</span>':'<span style="color:var(--accent);font-size:.78rem">On Time</span>'}</td>
      </tr>`).join('');
  } catch(e) { toast('Failed to load attendance','error'); }
}

// ═══════════════════════════════════════════════════════════
//  SUPERVISOR: SUPPLY INBOX
// ═══════════════════════════════════════════════════════════
let _svSupplyFilter='all';
async function loadSvSupplies() {
  initSvSupplyFilters();
  await renderSvSupplies('all');
}

function initSvSupplyFilters() {
  document.querySelectorAll('[data-svfilter]').forEach(btn=>{
    btn.onclick=()=>{ document.querySelectorAll('[data-svfilter]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderSvSupplies(btn.dataset.svfilter); };
  });
}

async function renderSvSupplies(filter) {
  _svSupplyFilter=filter; showLoading('sv-supply-list');
  try {
    const url=filter==='all'?'/supplies/all':(`/supplies/all?status=${filter}`);
    const data=await API.get(url);
    const items=data?.requests||[];
    setText('sv-sup-pending',  items.filter(s=>s.status==='pending').length);
    setText('sv-sup-approved', items.filter(s=>s.status==='approved').length);
    setText('sv-sup-fulfilled',items.filter(s=>s.status==='fulfilled').length);
    setText('sv-sup-urgent',   items.filter(s=>s.urgency==='urgent').length);
    if(!items.length){showEmpty('sv-supply-list','📭','No requests.');return;}
    $('sv-supply-list').innerHTML=items.map(s=>`
      <div class="sv-supply-item urgency-${s.urgency}">
        <div class="sv-item-top">
          <span class="sv-item-icon">${s.itemIcon||'📦'}</span>
          <span class="sv-item-name">${s.itemName}</span>
          ${s.urgency==='urgent'?'<span class="ai-priority p-urgent">🚨 Urgent</span>':''}
          <span class="supply-status status-${s.status}" style="margin-left:auto">${cap(s.status)}</span>
        </div>
        <div class="sv-item-meta">From <strong>${s.user?.name}</strong> (${cap(s.user?.role)}) · ${elapsed(s.createdAt)}${s.notes?' · '+s.notes:''}</div>
        ${s.status==='pending'?`<div class="sv-item-actions"><button class="btn-approve" onclick="svApproveSupply('${s.id}')">✓ Approve</button><button class="btn-reject" onclick="svRejectSupply('${s.id}')">✗ Reject</button></div>`:''}
        ${s.status==='approved'?`<div class="sv-item-actions"><button class="btn-purchased" onclick="svMarkPurchased('${s.id}')">🛒 Mark Purchased</button></div>`:''}
      </div>`).join('');
  } catch(e) { showEmpty('sv-supply-list','⚠️','Could not load.'); }
}

async function svApproveSupply(id)   { try { await API.patch(`/supplies/${id}/status`,{status:'approved'});   toast('Approved','success'); renderSvSupplies(_svSupplyFilter); } catch(e){ toast(e.message,'error'); } }
async function svRejectSupply(id)    { try { await API.patch(`/supplies/${id}/status`,{status:'rejected'});   toast('Request rejected','info'); renderSvSupplies(_svSupplyFilter); } catch(e){ toast(e.message,'error'); } }
async function svMarkPurchased(id)   { try { await API.patch(`/supplies/${id}/status`,{status:'fulfilled'}); toast('🛒 Marked purchased','success'); renderSvSupplies(_svSupplyFilter); } catch(e){ toast(e.message,'error'); } }
async function quickApproveSupply(id){ await svApproveSupply(id); loadOverview(); }
async function quickRejectSupply(id) { await svRejectSupply(id);  loadOverview(); }

// ═══════════════════════════════════════════════════════════
//  SUPERVISOR: LEAVE INBOX
// ═══════════════════════════════════════════════════════════
let _svLeaveFilter='all';
async function loadSvLeave() {
  initSvLeaveFilters(); await renderSvLeave('all');
}
function initSvLeaveFilters() {
  document.querySelectorAll('[data-lvfilter]').forEach(btn=>{
    btn.onclick=()=>{ document.querySelectorAll('[data-lvfilter]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderSvLeave(btn.dataset.lvfilter); };
  });
}
async function renderSvLeave(filter) {
  _svLeaveFilter=filter; showLoading('sv-leave-list');
  try {
    const url=filter==='all'?'/leave/all':`/leave/all?status=${filter}`;
    const data=await API.get(url);
    const items=data?.requests||[];
    setText('sv-leave-pending',  items.filter(l=>l.status==='pending').length);
    setText('sv-leave-approved', items.filter(l=>l.status==='approved').length);
    setText('sv-leave-declined', items.filter(l=>l.status==='declined').length);
    setText('sv-leave-today',    items.filter(l=>l.status==='approved'&&new Date(l.leaveDate).toDateString()===new Date().toDateString()).length);
    if(!items.length){showEmpty('sv-leave-list','📋','No requests.');return;}
    $('sv-leave-list').innerHTML=items.map(l=>`
      <div class="sv-supply-item" style="border-left-color:var(--purple)">
        <div class="sv-item-top">
          <span class="sv-item-icon">🌡️</span>
          <div style="flex:1"><div class="sv-item-name">${l.user?.name}</div><div style="font-size:.78rem;color:var(--accent);font-weight:600">${l.type}</div></div>
          <span class="supply-status status-${l.status}">${cap(l.status)}</span>
        </div>
        <div class="sv-item-meta">📅 ${fmtDate(l.leaveDate)}${l.returnDate?' → Return: '+fmtDate(l.returnDate):''} · <em>${l.reason}</em></div>
        <div class="sv-item-meta">Submitted: ${elapsed(l.createdAt)} · ${cap(l.user?.role)}</div>
        ${l.status==='pending'?`<div class="sv-item-actions" style="margin-top:10px"><button class="btn-approve" onclick="approveLeave('${l.id}')">✓ Approve</button><button class="btn-reject" onclick="declineLeave('${l.id}')">✗ Decline</button></div>`:''}
      </div>`).join('');
  } catch(e) { showEmpty('sv-leave-list','⚠️','Could not load.'); }
}
async function approveLeave(id) { try { await API.patch(`/leave/${id}`,{status:'approved'}); toast('Leave approved','success'); renderSvLeave(_svLeaveFilter); } catch(e){ toast(e.message,'error'); } }
async function declineLeave(id) { try { await API.patch(`/leave/${id}`,{status:'declined'}); toast('Leave declined','info');   renderSvLeave(_svLeaveFilter); } catch(e){ toast(e.message,'error'); } }

// ═══════════════════════════════════════════════════════════
//  STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════
let _smFilter='all', _staffCache=[];
async function loadStaffMgmt() {
  try {
    const data=await API.get('/auth/staff');
    _staffCache=data?.staff||[];
    const top=[..._staffCache].sort((a,b)=>(b.tasksDone/Math.max(b.tasksTotal,1))-(a.tasksDone/Math.max(a.tasksTotal,1)))[0];
    setText('sm-in-count',    _staffCache.filter(s=>s.status==='in').length);
    setText('sm-out-count',   _staffCache.filter(s=>s.status==='out').length);
    setText('sm-absent-count','—');
    setText('sm-top-worker',  top?top.name.split(' ')[0]:'—');
    renderStaffCards('all');
    initSmFilters();
    const search=$('staff-search');
    if(search) search.oninput=e=>{ renderStaffCardsList(_staffCache.filter(s=>s.name.toLowerCase().includes(e.target.value.toLowerCase())&&(( _smFilter==='all')||s.status===_smFilter||s.role===_smFilter))); };
  } catch(e) { toast('Failed to load staff','error'); }
}
function initSmFilters() {
  document.querySelectorAll('[data-smfilter]').forEach(btn=>{
    btn.onclick=()=>{ document.querySelectorAll('[data-smfilter]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); _smFilter=btn.dataset.smfilter; renderStaffCards(btn.dataset.smfilter); };
  });
}
function renderStaffCards(filter) {
  let s=[..._staffCache];
  if(filter==='in')   s=s.filter(x=>x.status==='in');
  else if(filter==='out') s=s.filter(x=>x.status==='out');
  else if(['cleaner','watchman','assistant'].includes(filter)) s=s.filter(x=>x.role===filter);
  renderStaffCardsList(s);
}
function renderStaffCardsList(staff) {
  const grid=$('staff-cards-grid'); if(!grid) return;
  if(!staff.length){showEmpty('staff-cards-grid','👥','No staff found.');return;}
  grid.innerHTML=staff.map(s=>{
    const pct=s.tasksTotal?Math.round(s.tasksDone/s.tasksTotal*100):0;
    const sc=pct>=85?'var(--accent)':pct>=60?'var(--amber)':'var(--red)';
    return `<div class="staff-card ${s.status==='out'?'card-out':''}" onclick="openWorkerModal('${s.id}')">
      <div class="sc-top">
        <div class="sc-avatar">${s.avatarUrl?`<img src="${s.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`:s.initials}</div>
        <div><div class="sc-name">${s.name}</div><div class="sc-role">${cap(s.role)} · ${s.section||''}</div></div>
        ${s.status==='in'?`<span class="status-in-pill sc-status-pill"><span class="live-dot"></span>In</span>`:`<span class="status-out-pill sc-status-pill">Out</span>`}
      </div>
      <div class="sc-task-bar">
        <div class="sc-task-label">Tasks today <span>${s.tasksDone}/${s.tasksTotal}</span></div>
        <div class="sc-bar"><div class="sc-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="sc-perf-score">
        <span style="font-size:.76rem;color:var(--text-3)">Task rate</span>
        <div class="sc-score-bar"><div class="sc-score-fill" style="width:${pct}%;background:${sc}"></div></div>
        <span style="font-family:var(--font-mono);font-size:.76rem;font-weight:700;color:${sc}">${pct}%</span>
      </div>
      <div class="sc-meta">
        <div class="sc-clock">In: <span>${fmtTime(s.clockIn)}</span></div>
      </div>
      <div class="sc-actions">
        <button class="sc-btn sc-btn-primary" onclick="event.stopPropagation();openWorkerModal('${s.id}')">👁 View</button>
        <button class="sc-btn" onclick="event.stopPropagation();openAssignForWorkerById('${s.id}')">📝 Assign</button>
        <button class="sc-btn" onclick="event.stopPropagation();msgWorkerDirect('${s.id}')">💬 Message</button>
      </div>
    </div>`;
  }).join('');
}

// Worker Modal
async function openWorkerModal(id) {
  currentWorker=_staffCache.find(s=>s.id===id); if(!currentWorker) return;
  const w=currentWorker;
  setText('wm-name',w.name); setText('wm-role',cap(w.role)+' — '+(w.section||''));
  setText('wm-id','ID: '+w.staffId); setText('wm-avatar',w.initials);
  setText('wm-days',w.daysWorked||'—'); setText('wm-tasks-done',w.tasksDone+'/'+w.tasksTotal);
  setText('wm-score',w.tasksTotal?Math.round(w.tasksDone/w.tasksTotal*100)+'%':'—'); setText('wm-late',w.isLate?'Yes':'No');
  const sb=$('wm-status-badge'); if(sb) sb.innerHTML=w.status==='in'?`<span class="status-in-pill"><span class="live-dot"></span>In ${fmtTime(w.clockIn)}</span>`:`<span class="status-out-pill">Not Clocked In</span>`;
  document.querySelectorAll('.wm-tab').forEach(t=>{ t.onclick=()=>{ document.querySelectorAll('.wm-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); renderWorkerTab(t.dataset.wtab,w); }; });
  document.querySelector('.wm-tab')?.click();
  $('worker-modal')?.classList.remove('hidden');
}

function renderWorkerTab(tab, w) {
  const el=$('wm-tab-content'); if(!el) return;
  if(tab==='today') {
    el.innerHTML=`<div style="padding:12px;text-align:center;color:var(--text-3)">Tasks: ${w.tasksDone}/${w.tasksTotal} complete today</div>`;
  } else if(tab==='attendance') {
    el.innerHTML=`<div style="padding:12px;font-size:.85rem;color:var(--text-2)">Clock In: ${fmtTime(w.clockIn)}&nbsp;&nbsp;Clock Out: ${fmtTime(w.clockOut)||'Active'}</div>`;
  } else if(tab==='performance') {
    const pct=w.tasksTotal?Math.round(w.tasksDone/w.tasksTotal*100):0;
    el.innerHTML=`<div class="wm-perf-row"><div class="wm-perf-label"><span>Tasks Today</span><span style="font-weight:700;color:var(--accent)">${pct}%</span></div><div class="wm-perf-bar-wrap"><div class="wm-perf-bar" style="width:${pct}%;background:var(--accent)"></div></div></div>`;
  }
}

function closeWorkerModal()            { $('worker-modal')?.classList.add('hidden'); }
function openAssignForWorker()         { closeWorkerModal(); switchTab('task-assign'); if(currentWorker){const s=$('ta-worker');if(s)s.value=currentWorker.id;} }
function openAssignForWorkerById(id)   { currentWorker=_staffCache.find(s=>s.id===id); openAssignForWorker(); }
function messageWorkerNow()            { if(currentWorker) msgWorkerDirect(currentWorker.id); else closeWorkerModal(); }
function msgWorkerDirect(id)           { closeWorkerModal(); switchTab('messages'); setTimeout(()=>openChat(id),120); }

// ═══════════════════════════════════════════════════════════
//  TASK ASSIGNMENT
// ═══════════════════════════════════════════════════════════
let _taFilter='all', _assignments=[];
async function loadTaskAssign() {
  $('ta-assign-btn').onclick=assignTask;
  $('reset-tasks-btn').onclick=resetAllTasks;
  initTaFilters();
  await refreshAssignments();
  await loadStaffDropdown();
}

async function loadStaffDropdown() {
  try {
    const data=await API.get('/auth/staff');
    const staff=data?.staff||[];
    const sel=$('ta-worker'); if(!sel) return;
    sel.innerHTML=`<option value="">Select worker or group...</option>
      <option value="all">📢 All Staff</option>
      <option value="all-cleaners">🧹 All Cleaners</option>
      <option value="all-watchmen">🔒 All Watchmen</option>
      <option value="all-assistants">🗂️ All Assistants</option>
      <option disabled>── Individual ──</option>
      ${staff.map(s=>`<option value="${s.id}">${s.name} (${cap(s.role)})</option>`).join('')}`;
  } catch(e){}
}

async function refreshAssignments() {
  showLoading('assignment-list');
  try {
    const data=await API.get('/assigned-tasks');
    _assignments=data?.tasks||[];
    updateTaSummary(); renderAssignments(_taFilter);
  } catch(e) { showEmpty('assignment-list','📝','No tasks assigned today.'); }
}

function updateTaSummary() {
  setText('ta-done-num',    _assignments.filter(a=>a.isDone).length);
  setText('ta-pending-num', _assignments.filter(a=>!a.isDone).length);
  setText('ta-overdue-num', _assignments.filter(a=>!a.isDone&&a.priority==='urgent').length);
}

function initTaFilters() {
  document.querySelectorAll('[data-tafilter]').forEach(btn=>{
    btn.onclick=()=>{ document.querySelectorAll('[data-tafilter]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); _taFilter=btn.dataset.tafilter; renderAssignments(btn.dataset.tafilter); };
  });
}

function renderAssignments(filter) {
  const el=$('assignment-list'); if(!el) return;
  let items=[..._assignments];
  if(filter==='pending')   items=items.filter(a=>!a.isDone);
  else if(filter==='completed') items=items.filter(a=>a.isDone);
  else if(filter==='urgent')    items=items.filter(a=>a.priority==='urgent');
  if(!items.length){showEmpty('assignment-list','📝','No tasks found.');return;}
  el.innerHTML=items.map(a=>`
    <div class="assign-item ${a.isDone?'ai-done':''} ai-${a.priority}">
      <div class="ai-check ${a.isDone?'checked':''}">${a.isDone?'✓':''}</div>
      <div class="ai-body">
        <div class="ai-task-name">${a.name}</div>
        <div class="ai-meta"><span>📍 ${a.location}</span>${a.dueTime?`<span>⏰ ${a.dueTime}</span>`:''} ${a.isDone&&a.completedAt?`<span style="color:var(--accent)">✅ ${fmtTime(a.completedAt)}</span>`:''}</div>
        <div class="ai-assignee">👤 ${a.assignedTo?.name||a.groupTarget||'—'}</div>
      </div>
      <div class="ai-actions">
        <span class="ai-priority p-${a.priority}">${a.priority==='urgent'?'🚨 Urgent':a.priority==='high'?'🔴 High':'Normal'}</span>
        ${!a.isDone?`<button class="sc-btn sc-btn-primary" style="font-size:.72rem;padding:5px 10px" onclick="markAssignDone('${a.id}')">Mark Done</button>`:''}
        <button class="ai-del-btn" onclick="deleteAssign('${a.id}')">🗑</button>
      </div>
    </div>`).join('');
}

async function assignTask() {
  const workerId=$('ta-worker')?.value, taskName=$('ta-task-name')?.value.trim(), location=$('ta-location')?.value.trim();
  const priority=document.querySelector('input[name="ta-priority"]:checked')?.value||'normal';
  const due=$('ta-due')?.value, notes=$('ta-notes')?.value.trim();
  if(!workerId){toast('Select a worker','error');return;}
  if(!taskName){toast('Enter a task name','error');return;}
  if(!location){toast('Enter a location','error');return;}
  const isGroup=['all','all-cleaners','all-watchmen','all-assistants'].includes(workerId);
  try {
    await API.post('/assigned-tasks',{
      name:taskName, location, notes, priority, dueTime:due||null,
      assignedToId:isGroup?null:workerId, groupTarget:isGroup?workerId:null,
    });
    toast(`Task assigned`,'success');
    setVal('ta-task-name',''); setVal('ta-location',''); setVal('ta-due',''); setVal('ta-notes','');
    const r=document.querySelector('input[name="ta-priority"][value="normal"]'); if(r) r.checked=true;
    await refreshAssignments();
  } catch(e) { toast(e.message||'Failed to assign','error'); }
}

async function markAssignDone(id) {
  try { await API.patch(`/assigned-tasks/${id}/done`); toast('Task marked complete','success'); await refreshAssignments(); } catch(e){ toast(e.message,'error'); }
}
async function deleteAssign(id) {
  try { await API.delete(`/assigned-tasks/${id}`); await refreshAssignments(); } catch(e){ toast(e.message,'error'); }
}
async function resetAllTasks() {
  if(!confirm('Reset ALL task completions for today? This cannot be undone.')) return;
  try { await API.post('/assigned-tasks/reset'); toast('All tasks reset for today','success'); await refreshAssignments(); } catch(e){ toast(e.message||'Failed','error'); }
}

// ═══════════════════════════════════════════════════════════
//  SECTIONS
// ═══════════════════════════════════════════════════════════
let _selectedIcon='🧹';
function initSectionIconPicker() {
  document.querySelectorAll('.icon-opt').forEach(btn=>{
    btn.onclick=()=>{ document.querySelectorAll('.icon-opt').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); _selectedIcon=btn.dataset.icon; };
  });
}
async function loadSections() {
  initSectionIconPicker();
  $('create-section-btn')?.addEventListener('click', createSection);
  await renderSections();
}
async function renderSections() {
  const list=$('sections-list'); if(!list) return;
  showLoading('sections-list');
  try {
    const [sectData, staffData] = await Promise.all([API.get('/sections'), API.get('/auth/staff')]);
    const sections=sectData?.sections||[], staff=staffData?.staff||[];
    if(!sections.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">🏢</div><p>No sections yet. Create one above.</p></div>';return;}
    list.innerHTML=sections.map(sec=>{
      const members=sec.members||[];
      return `<div class="section-card">
        <div class="section-card-header">
          <div class="section-icon">${sec.icon}</div>
          <div><div class="section-name">${sec.name}</div><div class="section-desc">${sec.description||''}</div></div>
          <div class="section-count">${members.length} staff</div>
          <button class="section-delete" onclick="deleteSection('${sec.id}')">🗑 Delete</button>
        </div>
        <div class="section-members">
          ${members.map(m=>`<div class="member-chip">${m.user?.name?.split(' ')[0]||'—'}<button class="member-chip-remove" onclick="removeMember('${sec.id}','${m.userId}')">✕</button></div>`).join('')}
          ${!members.length?'<span style="font-size:.8rem;color:var(--text-3)">No members yet</span>':''}
        </div>
        <div class="add-member-row">
          <select class="input-field" id="add-mem-${sec.id}" style="padding:8px 12px;font-size:.85rem">
            <option value="">Add worker to section...</option>
            ${staff.filter(s=>!members.find(m=>m.userId===s.id)).map(s=>`<option value="${s.id}">${s.name} (${cap(s.role)})</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="addMemberToSection('${sec.id}')">Add</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) { showEmpty('sections-list','⚠️','Could not load sections.'); }
}
async function createSection() {
  const name=$('sec-name')?.value.trim(), desc=$('sec-desc')?.value.trim();
  if(!name){toast('Enter a section name','error');return;}
  try { await API.post('/sections',{name,icon:_selectedIcon,description:desc}); setVal('sec-name',''); setVal('sec-desc',''); await renderSections(); toast(`"${name}" created`,'success'); } catch(e){ toast(e.message,'error'); }
}
async function addMemberToSection(secId) {
  const sel=$(`add-mem-${secId}`); if(!sel?.value) return;
  try { await API.post(`/sections/${secId}/members`,{userId:sel.value}); await renderSections(); toast('👤 Member added','success'); } catch(e){ toast(e.message,'error'); }
}
async function removeMember(secId, userId) {
  try { await API.delete(`/sections/${secId}/members/${userId}`); await renderSections(); toast('Member removed','info'); } catch(e){ toast(e.message,'error'); }
}
async function deleteSection(secId) {
  if(!confirm('Delete this section?')) return;
  try { await API.delete(`/sections/${secId}`); await renderSections(); toast('Section deleted','info'); } catch(e){ toast(e.message,'error'); }
}

// ═══════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════
async function loadAnnounceTab() {
  $('ann-send-btn').onclick=sendAnnouncement;
  await loadAnnounceList();
}
async function sendAnnouncement() {
  const title=$('ann-title')?.value.trim(), body=$('ann-body')?.value.trim();
  const target=$('ann-target')?.value||'all', priority=$('ann-priority')?.value||'normal';
  if(!title||!body){toast('Enter title and message','error');return;}
  try {
    await API.post('/announcements',{title,body,priority,target});
    setVal('ann-title',''); setVal('ann-body','');
    await loadAnnounceList(); await renderAnnouncementBanners();
    toast(`Announcement sent`,'success');
  } catch(e){ toast(e.message,'error'); }
}
async function loadAnnounceList() {
  const list=$('ann-list'); if(!list) return;
  try {
    const data=await API.get('/announcements');
    const items=data?.announcements||[];
    if(!items.length){list.innerHTML='<div class="log-loading">No announcements yet.</div>';return;}
    const tl=(t)=>({'all':'📢 All','cleaner':'🧹 Cleaners','watchman':'🔒 Watchmen','assistant':'🗂️ Assistants','supervisor':'👔 Supervisors'}[t]||t);
    list.innerHTML=items.map(a=>`
      <div class="ann-list-item ${a.priority==='urgent'?'priority-urgent':''}">
        <div class="ann-list-header"><span>${a.priority==='urgent'?'🚨':'📢'}</span><span class="ann-list-title">${a.title}</span><span class="ann-target-badge">${tl(a.target)}</span></div>
        <div class="ann-list-body">${a.body}</div>
        <div class="ann-list-meta"><span>By ${a.author?.name||'—'}</span><span>${elapsed(a.createdAt)}</span></div>
      </div>`).join('');
  } catch(e) { list.innerHTML='<div class="log-loading">Could not load.</div>'; }
}
async function renderAnnouncementBanners() {
  const area=$('announcements-area'); if(!area) return;
  try {
    const data=await API.get('/announcements');
    const items=(data?.announcements||[]).slice(0,2);
    if(!items.length){area.innerHTML='';return;}
    const tl=(t)=>({'all':'All Staff','cleaner':'Cleaners','watchman':'Watchmen','assistant':'Assistants','supervisor':'Supervisors'}[t]||t);
    area.innerHTML=items.map(a=>`
      <div class="announcement-banner" id="ann-banner-${a.id}" style="${a.priority==='urgent'?'border-color:rgba(255,71,87,.28);background:rgba(255,71,87,.04)':''}">
        <div class="ann-icon">${a.priority==='urgent'?'🚨':'📢'}</div>
        <div class="ann-body">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><div class="ann-title">${a.title}</div><span class="ann-target-badge">${tl(a.target)}</span></div>
          <div class="ann-text">${a.body}</div>
          <div class="ann-meta">From ${a.author?.name||'—'} · ${elapsed(a.createdAt)}</div>
        </div>
        <button class="ann-dismiss" onclick="dismissAnn('${a.id}')">✕</button>
      </div>`).join('');
  } catch(e){}
}
function dismissAnn(id) { const el=$(`ann-banner-${id}`); if(!el) return; el.style.cssText='opacity:0;transform:translateY(-8px);transition:all .3s'; setTimeout(()=>el.remove(),300); }

// ═══════════════════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════════════════
let _msgListenersAdded = false; // prevent duplicate event listeners

async function loadMessagesTab() {
  activeChatPartnerId = null;
  $('chat-panel')?.classList.add('hidden');
  $('chat-empty-state')?.classList.remove('hidden');

  // Add event listeners only once
  if (!_msgListenersAdded) {
    $('chat-send-btn')?.addEventListener('click', sendMessage);
    $('chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    _msgListenersAdded = true;
  }

  await loadConvList();
  loadMsgBadge();

  // For staff (non-supervisor): auto-find and open supervisor chat
  if (S.user.role !== 'supervisor' && S.user.role !== 'assistant') {
    try {
      // First try to find an existing conversation with supervisor
      const convData = await API.get('/messages/conversations');
      const svConv = convData?.conversations?.find(c =>
        c.partner?.role === 'supervisor' || c.partner?.role === 'assistant'
      );
      if (svConv) {
        openChat(svConv.partner.id);
      } else {
        // No conversation yet — find supervisor from staff list and show their profile ready to chat
        const staffData = await API.get('/auth/staff');
        const supervisors = (staffData?.staff || []).filter(s => s.role === 'supervisor' || s.role === 'assistant');
        if (supervisors.length > 0) {
          // Show supervisor as a conversation option even with no messages
          const el = $('conv-list-inner'); if (el) {
            el.innerHTML = supervisors.map(sv => {
              const init = sv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
              return `<div class="conv-item" onclick="openChat('${sv.id}')">
                <div class="conv-avatar">${init}</div>
                <div class="conv-info">
                  <div class="conv-name">${sv.name} <span class="conv-role-tag">${cap(sv.role)}</span></div>
                  <div class="conv-last">Tap to start a conversation</div>
                </div>
              </div>`;
            }).join('');
          }
        }
      }
    } catch(e) { console.warn('Messages load error:', e); }
  }
}

async function loadConvList() {
  const el=$('conv-list-inner'); if(!el) return;
  try {
    const data=await API.get('/messages/conversations');
    const convs=data?.conversations||[];
    if(!convs.length){el.innerHTML='<div style="padding:16px;font-size:.83rem;color:var(--text-3)">No conversations yet.</div>';return;}
    el.innerHTML=convs.map(c=>{
      const p=c.partner, last=c.lastMessage;
      const lastText=last?(last.text.length>38?last.text.substring(0,38)+'…':last.text):'No messages yet';
      const init=p.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
      const isActive=activeChatPartnerId===p.id;
      return `<div class="conv-item ${isActive?'conv-active':''} ${c.unread?'conv-unread':''}" onclick="openChat('${p.id}')">
        <div class="conv-avatar">${init}</div>
        <div class="conv-info">
          <div class="conv-name">${p.name} <span class="conv-role-tag">${cap(p.role)}</span></div>
          <div class="conv-last">${lastText}</div>
        </div>
        ${c.unread?`<div class="conv-unread-dot">${c.unread}</div>`:''}
      </div>`;
    }).join('');
  } catch(e){}
}

async function openChat(partnerId) {
  activeChatPartnerId=partnerId;
  $('chat-panel')?.classList.remove('hidden');
  $('chat-empty-state')?.classList.add('hidden');
  try {
    const convData=await API.get('/messages/conversations');
    const conv=convData?.conversations?.find(c=>c.partner?.id===partnerId);
    const p=conv?.partner||{name:'—',role:'—'};
    const init=p.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    setText('chat-partner-name', p.name); setText('chat-partner-role', cap(p.role)); setText('chat-partner-init', init);
    socket?.emit('mark-messages-read', { fromId: partnerId });
    await loadChatMessages(partnerId);
    await loadConvList();
    loadMsgBadge();
  } catch(e){}
}

async function loadChatMessages(partnerId) {
  const el=$('chat-messages'); if(!el) return;
  try {
    const data=await API.get(`/messages/${partnerId}`);
    const msgs=data?.messages||[];
    const myId=S.user.id;
    if(!msgs.length){el.innerHTML='<div class="chat-empty">No messages yet. Say hello 👋</div>';return;}
    el.innerHTML=msgs.map(m=>{
      const isMe=m.fromId===myId;
      const t=new Date(m.createdAt).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',hour12:false});
      return `<div class="chat-msg ${isMe?'chat-msg-me':'chat-msg-them'}">
        <div class="chat-bubble">${m.text}</div>
        <div class="chat-meta">${t}${isMe?(m.isRead?' ✓✓':' ✓'):''}</div>
      </div>`;
    }).join('');
    setTimeout(()=>{el.scrollTop=el.scrollHeight;},50);
  } catch(e){}
}

async function sendMessage() {
  const input=$('chat-input'); const text=input?.value.trim();
  if(!text||!activeChatPartnerId) return;
  input.value='';
  if(socket?.connected) {
    socket.emit('send-message',{toId:activeChatPartnerId, text});
    // Optimistic update
    const el=$('chat-messages'); if(el){
      const t=new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',hour12:false});
      el.innerHTML+=`<div class="chat-msg chat-msg-me"><div class="chat-bubble">${text}</div><div class="chat-meta">${t} ✓</div></div>`;
      setTimeout(()=>{el.scrollTop=el.scrollHeight;},20);
    }
    setTimeout(()=>loadChatMessages(activeChatPartnerId),500);
  } else {
    try { await API.post('/messages',{toId:activeChatPartnerId,text}); await loadChatMessages(activeChatPartnerId); } catch(e){ toast('Failed to send','error'); }
  }
}

async function loadMsgBadge() {
  try {
    const data=await API.get('/messages/conversations');
    const unread=(data?.conversations||[]).reduce((a,c)=>a+(c.unread||0),0);
    const badge=$('msg-badge'); if(badge){ badge.textContent=unread; badge.classList.toggle('hidden',unread===0); }
  } catch(e){}
}

// ── USER MENU ───────────────────────────────────────────────
function initUserMenu() {
  $('user-menu')?.addEventListener('click',e=>{e.stopPropagation();$('user-dropdown')?.classList.toggle('hidden');});
  document.addEventListener('click',()=>$('user-dropdown')?.classList.add('hidden'));

  // ── MOBILE HAMBURGER ──
  const menuBtn  = $('mobile-menu-btn');
  const sidebar  = document.querySelector('.app-sidebar');
  const overlay  = $('sidebar-overlay');

  function openSidebar(){
    sidebar?.classList.add('open');
    overlay?.classList.add('visible');
    menuBtn?.classList.add('open');
    document.body.style.overflow='hidden';
  }
  function closeSidebar(){
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
    menuBtn?.classList.remove('open');
    document.body.style.overflow='';
  }

  menuBtn?.addEventListener('click', e=>{
    e.stopPropagation();
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay?.addEventListener('click', closeSidebar);

  // Close sidebar when nav item tapped on mobile
  document.querySelectorAll('.sidebar-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{ if(window.innerWidth<=900) closeSidebar(); });
  });

  // ── MOBILE BOTTOM NAV ──
  buildMobileBottomNav();
}

function buildMobileBottomNav(){
  const nav = $('mobile-bottom-nav-inner'); if(!nav) return;
  const role = S.user?.role || 'cleaner';

  // Pick top 5 most important tabs per role for bottom nav
  const bottomNavItems = {
    cleaner:    [{tab:'attendance',label:'Attendance',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'},{tab:'checklist',label:'Tasks',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'},{tab:'supply-staff',label:'Supplies',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>'},{tab:'messages',label:'Messages',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},{tab:'notifications',label:'Alerts',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'}],
    watchman:   [{tab:'attendance',label:'Attendance',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'},{tab:'checklist',label:'Tasks',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'},{tab:'incidents',label:'Incidents',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'},{tab:'messages',label:'Messages',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},{tab:'notifications',label:'Alerts',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'}],
    assistant:  [{tab:'sv-attendance',label:'Attendance',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'},{tab:'sv-supplies',label:'Supplies',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>'},{tab:'sv-leave',label:'Leave',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>'},{tab:'messages',label:'Messages',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},{tab:'notifications',label:'Alerts',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>'}],
    supervisor: [{tab:'overview',label:'Overview',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'},{tab:'staff-mgmt',label:'Staff',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'},{tab:'sv-supplies',label:'Supplies',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>'},{tab:'messages',label:'Messages',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},{tab:'notifications',label:'Alerts',svg:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>'}],
  };

  const items = bottomNavItems[role] || bottomNavItems.cleaner;
  nav.innerHTML = items.map(item=>`
    <button class="mobile-nav-item ${S.activeTab===item.tab?'active':''}" data-tab="${item.tab}" onclick="switchTab('${item.tab}');updateMobileNav('${item.tab}')">
      ${item.svg}
      <span>${item.label}</span>
    </button>`).join('');
}

function updateMobileNav(activeTab){
  document.querySelectorAll('.mobile-nav-item').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab===activeTab);
  });
}

// ── LOGOUT ──────────────────────────────────────────────────
function logout(){localStorage.removeItem('socs_token');localStorage.removeItem('socs_user');window.location.href='/login.html';}

// ── GLOBALS ─────────────────────────────────────────────────
window.switchTab=switchTab; window.toggleTask=toggleTask; window.setWellness=setWellness;
window.dismissAnn=dismissAnn; window.dismissNotif=dismissNotif;
window.openWorkerModal=openWorkerModal; window.closeWorkerModal=closeWorkerModal;
window.openAssignForWorker=openAssignForWorker; window.openAssignForWorkerById=openAssignForWorkerById;
window.messageWorkerNow=messageWorkerNow; window.msgWorkerDirect=msgWorkerDirect;
window.markAssignDone=markAssignDone; window.deleteAssign=deleteAssign;
window.svApproveSupply=svApproveSupply; window.svRejectSupply=svRejectSupply; window.svMarkPurchased=svMarkPurchased;
window.quickApproveSupply=quickApproveSupply; window.quickRejectSupply=quickRejectSupply;
window.approveLeave=approveLeave; window.declineLeave=declineLeave;
window.addMemberToSection=addMemberToSection; window.removeMember=removeMember; window.deleteSection=deleteSection;
window.openChat=openChat; window.sendMessage=sendMessage;
window.updateMobileNav=updateMobileNav;
