// Tests for the database security rules, run against Firebase's local emulator.
// From this folder:  npm install  then  npm test
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, set, get, update, remove, serverTimestamp } = require('firebase/database');

let env;
const CODE = 'KQXT';
const room = p => 'rooms/' + CODE + (p ? '/' + p : '');

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-trivia-night',
    database: { rules: fs.readFileSync(path.join(__dirname, 'database.rules.json'), 'utf8'), host: '127.0.0.1', port: 9000 }
  });
});
test.after(() => env.cleanup());
test.beforeEach(() => env.clearDatabase());

const db = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
// A host signed in with Google (players are anonymous).
const google = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).database();
const anon = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).database();

// A room hosted by "host", in a given phase, with a team "bears" and a player "p1" on it.
async function seed(phase = 'lobby', extra = {}) {
  await env.withSecurityRulesDisabled(async ctx => {
    await set(ref(ctx.database(), room()), {
      host: 'host',
      public: Object.assign({ phase }, extra),
      private: { secret: 'answers live here' },
      teams: { t1: { name: 'Bears', slug: 'bears', by: 'p1', at: 1 } },
      names: { bears: 't1' },
      players: { p1: { team: 't1' } }
    });
  });
}

test('only signed-in people can read a room, and nobody but the host reads the answers', async () => {
  await seed();
  await assertFails(get(ref(db(null), room('public'))));
  await assertSucceeds(get(ref(db('p1'), room('public'))));
  await assertFails(get(ref(db('p1'), room('private'))));
  await assertSucceeds(get(ref(db('host'), room('private'))));
});

test('the first person to claim a room code becomes its host; nobody can take it over', async () => {
  await assertSucceeds(set(ref(db('host'), room('host')), 'host'));
  await assertFails(set(ref(db('intruder'), room('host')), 'intruder'));
  await assertFails(set(ref(db('host'), 'rooms/bad-code/host'), 'host'));
});

test('only the host writes the game state', async () => {
  await seed();
  await assertSucceeds(set(ref(db('host'), room('public/phase')), 'board'));
  await assertFails(set(ref(db('p1'), room('public/phase')), 'final'));
  await assertFails(set(ref(db('p1'), room('public/teams/bears/score')), 9999));
});

// Creating a team writes its slot and claims its name in one go.
const makeTeam = (uid, slot, name, slug, by) => update(ref(db(uid), room()), {
  ['teams/' + slot]: { name, slug, by: by || uid, at: serverTimestamp() },
  ['names/' + slug]: slot
});

test('players can create teams in the lobby, with unique names and at most 4 teams', async () => {
  await seed();
  await assertSucceeds(makeTeam('p2', 't2', 'Tote Bags', 'tote-bags'));
  await assertFails(makeTeam('p3', 't3', 'bears', 'bears'), 'name already taken');
  await assertFails(makeTeam('p3', 't1', 'Owls', 'owls'), 'slot already taken');
  await assertFails(makeTeam('p3', 't3', 'X', 'x', 'someone-else'), 'must be signed as yourself');
  await assertFails(update(ref(db('p3'), room()), { 'teams/t3': { name: 'Y', slug: 'y', by: 'p3', at: serverTimestamp() } }), 'name must be claimed too');
  await assertSucceeds(makeTeam('p3', 't3', 'Three', 'three'));
  await assertSucceeds(makeTeam('p4', 't4', 'Four', 'four'));
  await assertFails(makeTeam('p5', 't5', 'Five', 'five'), 'there is no fifth slot');
});

test('team names lock when the game starts, but players can still join a team', async () => {
  await seed('board');
  await assertFails(makeTeam('p2', 't2', 'Late', 'late'));
  await assertSucceeds(set(ref(db('p2'), room('players/p2')), { team: 't1' }));
  await assertFails(set(ref(db('p3'), room('players/p3')), { team: 't3' }), 'team must exist');
  await assertFails(set(ref(db('p3'), room('players/p2')), { team: 't1' }), 'only yourself');
});

test('a player can buzz once for their own team, only while the question is open', async () => {
  const deadline = Date.now() + 30000;
  await seed('question', { q: { key: '0-1', deadline } });
  const buzz = uid => ({ at: serverTimestamp(), by: uid });
  await assertFails(set(ref(db('p1'), room('buzzes/0-1/t2')), buzz('p1')), 'not your team');
  await assertFails(set(ref(db('p1'), room('buzzes/0-2/t1')), buzz('p1')), 'not the open question');
  await assertFails(set(ref(db('p1'), room('buzzes/0-1/t1')), { at: 5, by: 'p1' }), 'must use the server clock');
  await assertSucceeds(set(ref(db('p1'), room('buzzes/0-1/t1')), buzz('p1')));
  await assertFails(set(ref(db('p1'), room('buzzes/0-1/t1')), buzz('p1')), 'already buzzed');
});

test('nobody can buzz after the timer ends or when no question is open', async () => {
  await seed('question', { q: { key: '0-1', deadline: Date.now() - 1000 } });
  await assertFails(set(ref(db('p1'), room('buzzes/0-1/t1')), { at: serverTimestamp(), by: 'p1' }));
  await seed('board', { q: { key: '0-1', deadline: Date.now() + 30000 } });
  await assertFails(set(ref(db('p1'), room('buzzes/0-1/t1')), { at: serverTimestamp(), by: 'p1' }));
});

test('only the picking team can choose the next tile', async () => {
  await seed('board', { picker: 't1' });
  await env.withSecurityRulesDisabled(ctx => update(ref(ctx.database(), room()), {
    'teams/t2': { name: 'Owls', slug: 'owls', by: 'p2', at: 1 }, 'names/owls': 't2', 'players/p2': { team: 't2' }
  }));
  const pick = team => ({ c: 2, r: 3, team, at: serverTimestamp() });
  await assertFails(set(ref(db('p2'), room('pick')), pick('t2')));
  await assertFails(set(ref(db('p2'), room('pick')), pick('t1')));
  await assertSucceeds(set(ref(db('p1'), room('pick')), pick('t1')));
});

test('the host can clear buzzes and picks, remove teams, and close the room', async () => {
  await seed('board', { picker: 't1' });
  await assertSucceeds(remove(ref(db('host'), room('teams/t1'))));
  await assertFails(remove(ref(db('p1'), room())));
  await assertSucceeds(remove(ref(db('host'), room())));
});

const aBoard = { title: 'Friday Night', categories: [{ name: 'Suits', questions: [{ q: 'Q', a: 'A' }] }], updatedAt: 1 };

test('your board library is yours alone, and needs a Google sign-in', async () => {
  await assertSucceeds(set(ref(google('dhriti'), 'boards/dhriti/b1'), aBoard));
  await assertSucceeds(get(ref(google('dhriti'), 'boards/dhriti')));
  await assertFails(get(ref(google('someone'), 'boards/dhriti')), 'other people cannot read it');
  await assertFails(set(ref(google('someone'), 'boards/dhriti/b2'), aBoard), 'or write to it');
  await assertFails(get(ref(anon('dhriti'), 'boards/dhriti')), 'anonymous sign-in is not enough');
  await assertFails(set(ref(anon('dhriti'), 'boards/dhriti/b3'), aBoard));
  await assertFails(get(ref(db(null), 'boards/dhriti')));
});

test('boards must look like boards', async () => {
  await assertFails(set(ref(google('dhriti'), 'boards/dhriti/b1'), { title: 'No questions' }));
  await assertFails(set(ref(google('dhriti'), 'boards/dhriti/b1'), Object.assign({}, aBoard, { title: 'X'.repeat(61) })));
  await assertFails(set(ref(google('dhriti'), 'boards/dhriti/bad id!'), aBoard));
  await assertSucceeds(set(ref(google('dhriti'), 'boards/dhriti/b1'), aBoard));
  await assertSucceeds(remove(ref(google('dhriti'), 'boards/dhriti/b1')));
});
