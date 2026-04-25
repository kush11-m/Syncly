import prisma from './utils/db.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "test_recruiter@syncly.com" } });
  const teams = await prisma.team.findMany({ 
    where: { adminId: user.id },
    include: {
      members: { include: { user: true } },
      tasks: true
    }
  });
  console.dir(teams, { depth: null });
}
main().catch(console.error);
