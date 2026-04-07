async function test() {
  // 1. Signup User A
  const resA = await fetch('http://127.0.0.1:8000/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User A', username: `userA_${Date.now()}`, email: `userA_${Date.now()}@test.com`, password: '123' })
  });
  const dataA = await resA.json();
  const tokenA = dataA.token;

  // 2. Create Team
  const resTeam = await fetch('http://127.0.0.1:8000/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': tokenA },
    body: JSON.stringify({ name: 'Team Alpha' })
  });
  const dataTeam = await resTeam.json();
  const teamId = dataTeam.team.id;
  console.log("Team created:", teamId);

  // 3. Signup User B
  const resB = await fetch('http://127.0.0.1:8000/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User B', username: `userB_${Date.now()}`, email: `userB_${Date.now()}@test.com`, password: '123' })
  });
  const dataB = await resB.json();
  const tokenB = dataB.token;

  // 4. User B Joins Team
  const resJoin = await fetch('http://127.0.0.1:8000/api/teams/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': tokenB },
    body: JSON.stringify({ teamId })
  });
  const dataJoin = await resJoin.json();
  console.log("Join response:", dataJoin);

  // 5. User B fetches their teams
  const resTeamsB = await fetch('http://127.0.0.1:8000/api/teams', {
    headers: { 'Authorization': tokenB }
  });
  const dataTeamsB = await resTeamsB.json();
  console.log("User B teams:", dataTeamsB.teams?.map(t => t.name));
}

test().catch(console.error);
