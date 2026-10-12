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

test('buzzers open as soon as the host picks a question', () => {
  let s = G.pick(start(), 0, 3, 1000);
  assert.equal(s.phase, 'question');
  assert.equal(s.q.value, 400);
  assert.ok(G.canBuzz(s, 't1', 1000));
  assert.equal(G.timeLeft(s, 11000), 20000);
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

test('the first buzz stops the timer, and other teams can still buzz in after it would have run out', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't1', 12000);
  assert.ok(G.timerStopped(s));
  assert.equal(G.timeLeft(s, 12000), 18000);
  assert.equal(G.timeLeft(s, 60000), 18000, 'stays frozen');
  assert.ok(G.canBuzz(s, 't2', 45000));
  s = G.buzz(s, 't2', 45000);
  assert.deepEqual(G.buzzOrder(s).map(o => o.team), ['t1', 't2']);
});

test('if time runs out with nobody buzzed, the buzzers close but the answer stays hidden', () => {
  let s = G.pick(start(), 0, 0, 0);
  assert.equal(G.status(s, 29999), 'open');
  assert.equal(G.canBuzz(s, 't1', 30000), false);
  assert.equal(G.status(s, 30000), 'time-up');
  assert.equal(s.phase, 'question', 'only the host reveals');
});

test('wrong costs the tile value and passes to the next team in line', () => {
  let s = G.pick(start(), 1, 1, 0); // 200
  s = G.buzz(s, 't1', 100);
  s = G.buzz(s, 't3', 200);
  s = G.judge(s, false);
  assert.equal(score(s, 't1'), -200);
  assert.equal(G.answering(s), 't3');
});

test('correct scores, closes the buzzers, and waits for the host to reveal', () => {
  let s = G.pick(start(), 1, 1, 0);
  s = G.buzz(s, 't3', 200);
  s = G.judge(s, true);
  assert.equal(score(s, 't3'), 200);
  assert.equal(s.phase, 'question', 'the answer is not shown yet');
  assert.equal(G.status(s, 1000), 'answered');
  assert.equal(G.canBuzz(s, 't1', 1000), false);
  assert.equal(G.skip(s), s, 'cannot throw out a question someone got right');
  s = G.reveal(s);
  assert.equal(s.phase, 'reveal');
  assert.equal(s.q.ended, 'correct');
  assert.ok(G.isPlayed(s, 1, 1));
});

test('when every team gets it wrong, the tile waits for the host to reveal', () => {
  let s = G.pick(start(), 0, 0, 0);
  ['t1', 't2', 't3'].forEach((id, i) => { s = G.buzz(s, id, 100 + i); });
  s = G.judge(s, false);
  s = G.judge(s, false);
  s = G.judge(s, false);
  assert.equal(s.phase, 'question');
  assert.equal(G.status(s, 5000), 'everyone-tried');
  s = G.reveal(s);
  assert.equal(s.q.ended, 'revealed');
});

test('skipping a question undoes its penalties', () => {
  let s = G.pick(start(), 0, 4, 0); // 500
  s = G.buzz(s, 't1', 100);
  s = G.judge(s, false);
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
  G.judge(G.buzz(s, 't1', 10), true);
  assert.equal(JSON.stringify(s), before);
});

test('the host can fix scores', () => {
  const s = G.adjustScore(start(), 't2', -100);
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

test('a buzz that arrives late but was pressed earlier takes its rightful place in line', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't1', 500);
  s = G.buzz(s, 't3', 900);
  s = G.buzz(s, 't2', 700); // pressed at 700, arrived after Charlie's
  assert.deepEqual(G.buzzOrder(s).map(o => o.team), ['t1', 't2', 't3']);
});

test('a late buzz never jumps ahead of a team that is already answering', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't1', 500);
  s = G.buzz(s, 't2', 400); // earlier time, but Alpha is already answering
  assert.deepEqual(G.buzzOrder(s).map(o => o.team), ['t1', 't2']);
});

test('an earlier-stamped buzz that arrives late moves the stopped clock back', () => {
  let s = G.pick(start(), 0, 0, 0);
  s = G.buzz(s, 't1', 5000);
  s = G.buzz(s, 't2', 4000);
  assert.equal(G.timeLeft(s, 9999), 26000);
});

test('the live game can choose its own team ids', () => {
  const s = G.createGame(board, [{ name: 'Bears', id: 't3' }]);
  assert.equal(s.teams[0].id, 't3');
});
