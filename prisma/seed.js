// SOCS v5 Seed
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SOCS v5...');
  const pw = await bcrypt.hash('demo123', 10);

  const users = await Promise.all([
    prisma.user.upsert({ where:{staffId:'STF-001'}, update:{name:'Margaret Gakuru',section:'Cleaning Team'}, create:{staffId:'STF-001',name:'Margaret Gakuru',email:'margaret@socs.co.ke',password:pw,role:'cleaner',section:'Cleaning Team'} }),
    prisma.user.upsert({ where:{staffId:'STF-002'}, update:{name:'Joseph Kamau',section:'Security'},        create:{staffId:'STF-002',name:'Joseph Kamau',email:'joseph@socs.co.ke',password:pw,role:'watchman',section:'Security'} }),
    prisma.user.upsert({ where:{staffId:'STF-003'}, update:{name:'Alice Wanjiru',section:'Administration'}, create:{staffId:'STF-003',name:'Alice Wanjiru',email:'alice@socs.co.ke',password:pw,role:'assistant',section:'Administration'} }),
    prisma.user.upsert({ where:{staffId:'STF-004'}, update:{name:'David Mwangi',section:'Cleaning Team'},   create:{staffId:'STF-004',name:'David Mwangi',email:'david@socs.co.ke',password:pw,role:'cleaner',section:'Cleaning Team'} }),
    prisma.user.upsert({ where:{staffId:'STF-005'}, update:{name:'Grace Njeri',section:'Cleaning Team'},    create:{staffId:'STF-005',name:'Grace Njeri',email:'grace@socs.co.ke',password:pw,role:'cleaner',section:'Cleaning Team'} }),
    prisma.user.upsert({ where:{staffId:'STF-006'}, update:{name:'Peter Odhiambo',section:'Security'},      create:{staffId:'STF-006',name:'Peter Odhiambo',email:'peter@socs.co.ke',password:pw,role:'watchman',section:'Security'} }),
    prisma.user.upsert({ where:{staffId:'SUP-001'}, update:{name:'Barack Ouko',section:'Management'},       create:{staffId:'SUP-001',name:'Barack Ouko',email:'supervisor@socs.co.ke',password:pw,role:'supervisor',section:'Management'} }),
  ]);
  console.log('✅ Users:', users.length);

  // Duty tasks
  const taskDefs = [
    {id:'mop-lab-1',          name:'Mop Lab 1',              location:'Block A',        assignedRole:'cleaner'},
    {id:'clean-windows',      name:'Clean Windows',          location:'Block B',        assignedRole:'cleaner'},
    {id:'restock-washrooms',  name:'Restock Washrooms',      location:'All Blocks',     assignedRole:'cleaner'},
    {id:'sanitize-common',    name:'Sanitize Common Areas',  location:'Ground Floor',   assignedRole:'cleaner'},
    {id:'empty-dustbins',     name:'Empty All Dustbins',     location:'All Rooms',      assignedRole:'cleaner'},
    {id:'clean-reception',    name:'Clean Reception Area',   location:'Main Entrance',  assignedRole:'cleaner'},
    {id:'perimeter-check',    name:'Morning Perimeter Check',location:'All Gates',      assignedRole:'watchman'},
    {id:'visitors-log',       name:'Sign In Visitors Log',   location:'Gate 1',         assignedRole:'watchman'},
    {id:'afternoon-rounds',   name:'Afternoon Rounds',       location:'All Floors',     assignedRole:'watchman'},
    {id:'cctv-monitors',      name:'Check CCTV Monitors',    location:'Security Room',  assignedRole:'watchman'},
    {id:'morning-tea',        name:'Prepare Morning Tea',    location:'Pantry',         assignedRole:'assistant'},
    {id:'stock-stationery',   name:'Stock Stationery Cabinet',location:'Office Store',  assignedRole:'assistant'},
    {id:'collect-mail',       name:'Collect Mail',           location:'Main Entrance',  assignedRole:'assistant'},
  ];
  for (const t of taskDefs) {
    await prisma.dutyTask.upsert({ where:{id:t.id}, update:{name:t.name,location:t.location}, create:t });
  }
  console.log('✅ Duty tasks:', taskDefs.length);

  // Sections
  const sup = users.find(u => u.staffId === 'SUP-001');
  const sectionDefs = [
    {id:'cleaning-team',  name:'Cleaning Team',  icon:'🧹', description:'All cleaning and housekeeping staff'},
    {id:'security',       name:'Security',        icon:'🔒', description:'Watchmen and security personnel'},
    {id:'administration', name:'Administration',  icon:'🗂️', description:'Office assistants and admin staff'},
  ];
  for (const s of sectionDefs) {
    await prisma.section.upsert({ where:{id:s.id}, update:{name:s.name}, create:s });
  }
  // Assign members
  const sectionMembers = [
    {sectionId:'cleaning-team',  staffIds:['STF-001','STF-004','STF-005']},
    {sectionId:'security',       staffIds:['STF-002','STF-006']},
    {sectionId:'administration', staffIds:['STF-003']},
  ];
  for (const sm of sectionMembers) {
    for (const staffId of sm.staffIds) {
      const u = users.find(x => x.staffId === staffId);
      if (!u) continue;
      await prisma.sectionMember.upsert({
        where:  { sectionId_userId: { sectionId: sm.sectionId, userId: u.id } },
        update: {},
        create: { sectionId: sm.sectionId, userId: u.id },
      });
    }
  }
  console.log('✅ Sections seeded');

  // AppState singleton
  await prisma.appState.upsert({
    where:  { id: 'singleton' },
    update: { tasksResetAt: new Date() },
    create: { id: 'singleton', tasksResetAt: new Date() },
  });

  // Welcome announcement
  await prisma.announcement.create({
    data: { title: 'Welcome to SOCS v5', body: 'System is live. All staff please clock in daily and update your tasks.', priority: 'normal', target: 'all', authorId: sup.id },
  }).catch(() => {}); // ignore if already exists

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  STF-001 / demo123  — Margaret Gakuru (Cleaner)');
  console.log('  STF-002 / demo123  — Joseph Kamau (Watchman)');
  console.log('  STF-003 / demo123  — Alice Wanjiru (Assistant)');
  console.log('  SUP-001 / demo123  — Barack Ouko (Supervisor)\n');
}

main()
  .catch(e => { console.error('❌ Seed error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
