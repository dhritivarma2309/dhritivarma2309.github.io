// Tests for the Trivia Night rules. Run from the repo root:  node --test lab/trivia/tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/game.js');

const board = {
  title: 'Test board',
  categories: Array.from({ length: 6 }, (_, c) => ({
    name: 'Cat ' + c,
    questions: Array.from({ length: 5 }, (_, r) => ({ q: 'Q' + c + r, a: 'A' + c + r }))
  }))
};
const start = () => G.createGame(board, [{ name: 'Alpha' }, { name: 'Bravo' }, { name: 'Charlie' }]);
const score = (s, id) => G.findTeam(s, id).score;

test('team names must be unique and there are at most 4 teams', () => {
  assert.throws(() => G.createGame(board, [{ name: 'Bears' }, { name: ' bears ' }]), /share the name/);
  assert.throws(() => G.createGame(board, [1, 2, 3, 4, 5].map(i => ({ name: 'T' + i }))), /up to 4/);
  assert.throws(() => G.createGame(board, [{ name: '  ' }]), /at least one/);
});

test('the host picks first, and buzzers open as soon as the question appears', () => {
  let s = start();
  assert.equal(s.picker, null);
  s = G.pick(s, 0, 3, 1000);
  assert.equal(s.phase, 'question');
  assert.equal(s.q.value, 400);
  assert.ok(G.canBuzz(s, 't1', 1000));
});

test('each team buzzes once, and the order is ranked with time gaps', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't2', 500);
  s = G.buzz(s, 't1', 810);
  s = G.buzz(s, 't2', 900); // second buzz from Bravo is ignored
  const order = G.buzzOrder(s);
  assert.deepEqual(order.map(o => o.team), ['t2', 't1']);
  assert.deepEqual(order.map(o => o.gap), [0, 310]);
  assert.equal(G.answering(s), 't2');
});

test('wrong costs the tile value and passes to the next team in line', () => {
  let s = G.pick(start(), 1, 1, 0); // 200
  s = G.buzz(s, 't1', 100);
  s = G.buzz(s, 't3', 200);
  s = G.judge(s, false, 3000);
  assert.equal(score(s, 't1'), -200);
  assert.equal(G.answering(s), 't3');
  s = G.judge(s, true, 5000);
  assert.equal(score(s, 't3'), 200);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.picker, 't3', 'the team that answered correctly picks next');
});

test('a team can still buzz in after another team got it wrong', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't1', 100);
  s = G.judge(s, false, 2000);
  assert.equal(s.phase, 'question', 'stays open while time is left');
  s = G.buzz(s, 't2', 4000);
  assert.equal(G.answering(s), 't2');
});

test('the tile closes once every team has tried and got it wrong', () => {
  let s = G.pick(start(), 0, 0, 0);
  ['t1', 't2', 't3'].forEach((id, i) => { s = G.buzz(s, id, 100 + i); });
  s = G.judge(s, false, 1000);
  s = G.judge(s, false, 2000);
  s = G.judge(s, false, 3000);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.q.ended, 'nobody');
  assert.equal(s.picker, null, 'picker is unchanged when nobody gets it right');
});

test('when time runs out, nobody new can buzz but teams in line still answer', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't1', 29000);
  assert.equal(G.canBuzz(s, 't2', 30000), false);
  s = G.tick(s, 31000);
  assert.equal(s.phase, 'question', 'Alpha is still answering');
  s = G.judge(s, false, 33000);
  assert.equal(s.phase, 'reveal', 'nobody left once Alpha is wrong');
});

test('time running out with nobody in line closes the tile', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.tick(s, 29999);
  assert.equal(s.phase, 'question');
  s = G.tick(s, 30000);
  assert.equal(s.phase, 'reveal');
});

test('skipping a question undoes its penalties', () => {
  let s = G.pick(start(), 0, 4, 0); // 500
  s = G.buzz(s, 't1', 100);
  s = G.judge(s, false, 1000);
  s = G.skip(s);
  assert.equal(score(s, 't1'), 0);
  assert.equal(s.q.ended, 'skipped');
  assert.ok(G.isPlayed(s, 0, 4));
});

test('played tiles cannot be picked again, and the last tile ends the game', () => {
  let s = start();
  for (let c = 0; c < 6; c++) for (let r = 0; r < 5; r++) {
    s = G.pick(s, c, r, 0);
    assert.equal(s.phase, 'question');
    s = G.next(G.reveal(s));
  }
  assert.equal(s.phase, 'final');
  assert.equal(G.pick(s, 0, 0, 0), s);
});

test('rules never change the state they were given', () => {
  const s = G.pick(start(), 0, 0, 0);
  const before = JSON.stringify(s);
  G.judge(G.buzz(s, 't1', 10), true, 20);
  assert.equal(JSON.stringify(s), before);
});

test('the host can override the picker and fix scores', () => {
  let s = G.setPicker(start(), 't2');
  assert.equal(s.picker, 't2');
  s = G.adjustScore(s, 't2', -100);
  assert.equal(score(s, 't2'), -100);
});

test('the host can type any whole-number score', () => {
  let s = G.setScore(start(), 't1', 750);
  assert.equal(score(s, 't1'), 750);
  s = G.setScore(s, 't1', -1250);
  assert.equal(score(s, 't1'), -1250);
  assert.equal(G.setScore(s, 't1', 'abc'), s, 'non-numbers are ignored');
  assert.equal(G.setScore(s, 'nobody', 10), s);
});
