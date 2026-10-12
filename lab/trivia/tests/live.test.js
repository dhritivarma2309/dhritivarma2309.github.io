// Tests for the live-room helpers. Run from the repo root:  node --test lab/trivia/tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/game.js');
const L = require('../js/live.js');

const board = {
  title: 'Live board',
  categories: Array.from({ length: 6 }, (_, c) => ({
    name: 'Cat ' + c,
    questions: Array.from({ length: 5 }, (_, r) => ({ q: 'Q' + c + r, a: 'A' + c + r }))
  }))
};

test('room codes are 4 easy-to-read capital letters', () => {
  for (let i = 0; i < 200; i++) assert.match(L.newCode(), /^[A-HJ-NP-Z]{4}$/);
  assert.equal(L.cleanCode(' k7q-x z '), 'KQXZ');
});

test('team names reduce to a simple form, so "Bears" and "bears!" count as the same name', () => {
  assert.equal(L.slug('Quizzly Bears!'), 'quizzly-bears');
  assert.equal(L.slug('  bears  '), L.slug('BEARS'));
  assert.equal(L.slug('Café Crew'), 'cafe-crew');
  assert.equal(L.slug('!!!'), 'team');
});

test('the lobby shows the board name and categories, but no questions', () => {
  const pub = L.project(G, null, board);
  assert.equal(pub.phase, 'lobby');
  assert.deepEqual(pub.categories, board.categories.map(c => c.name));
  assert.ok(!JSON.stringify(pub).includes('Q00'));
});

test('players never see an answer before it is revealed', () => {
  let s = G.createGame(board, [{ name: 'Bears', id: 't2' }, { name: 'Owls', id: 't4' }]);
  assert.ok(!JSON.stringify(L.project(G, s)).includes('A'), 'board phase shows no questions or answers');
  s = G.pick(s, 1, 2, 1000);
  let pub = L.project(G, s);
  assert.equal(pub.q.text, 'Q12');
  assert.equal(pub.q.answer, null);
  assert.equal(pub.q.key, '1-2');
  assert.ok(!JSON.stringify(pub).includes('A12'));
  s = G.judge(G.buzz(s, 't4', 1500), true, 2000);
  pub = L.project(G, s);
  assert.equal(pub.q.answer, 'A12');
  assert.equal(pub.teams.t4.score, 300);
  assert.equal(pub.picker, 't4');
  assert.deepEqual(pub.order, ['t2', 't4']);
  assert.equal(pub.played['1-2'], true);
});
