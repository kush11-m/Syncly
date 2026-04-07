import prisma from './utils/db.js';

async function run() {
  const admin = await prisma.user.create({
    data: { email: `admin_${Date.now()}@test.com`, password: '123', name: 'Admin', username: `admin_${Date.now()}` }
  });
  const member = await prisma.user.create({
    data: { email: `member_${Date.now()}@test.com`, password: '123', name: 'Member', username: `member_${Date.now()}` }
  });
  
  const team = await prisma.team.create({
    data: { name: 'My Team', adminId: admin.id }
  });

  // simulate joinTeam
  await prisma.teamMember.create({
    data: { userId: member.id, teamId: team.id, status: 'Active', role: 'Member' }
  });

  const memberTeams = await prisma.teamMember.findMany({
    where: { userId: member.id, status: 'Active' },
    include: { team: true }
  });

  console.log("Member teams:");
  memberTeams.forEach(t => console.log(t.team.name));
}

run().catch(console.error).finally(() => prisma.$disconnect());
