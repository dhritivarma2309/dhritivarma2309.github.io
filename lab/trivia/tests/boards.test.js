// Tests for board storage and checks. Run from the repo root:  node --test lab/trivia/tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

// A stand-in for the browser's storage.
const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); }
};
globalThis.TRIVIA_BOARDS = [];
const B = require('../js/boards.js');

function filled(title) {
  const b = B.blank(title);
  b.categories.forEach((c, i) => {
    c.name = 'Cat ' + i;
    c.questions.forEach((q, r) => { q.q = 'Q' + r; q.a = 'A' + r; });
  });
  return b;
}

test('a blank board is 6 categories x 5 questions and is not ready', () => {
  const b = B.blank('Night');
  assert.equal(b.categories.length, 6);
  assert.ok(b.categories.every(c => c.questions.length === 5));
  const c = B.check(b);
  assert.equal(c.filled, 0);
  assert.equal(c.total, 30);
  assert.equal(c.ready, false);
});

test('check names exactly what is missing', () => {
  const b = filled('Night');
  b.categories[2].name = 'Tennis';
  b.categories[2].questions[3].a = ' ';
  b.categories[4].name = '';
  const c = B.check(b);
  assert.equal(c.filled, 29);
  assert.deepEqual(c.missing, ['Tennis: 400 needs a question and answer.', 'Category 5 needs a name.']);
});

test('a complete board is ready', () => {
  assert.equal(B.check(filled('Night')).ready, true);
});

test('imported files are forced into the 6 x 5 shape', () => {
  const b = B.normalize({ title: 'X'.repeat(200), categories: [{ name: 'Only one', questions: [{ q: 'Hi', a: 'There' }] }], extra: 'ignored' });
  assert.equal(b.title.length, 60);
  assert.equal(b.categories.length, 6);
  assert.equal(b.categories[0].questions[0].a, 'There');
  assert.equal(b.categories[5].questions[4].q, '');
  assert.equal(B.normalize(null).categories.length, 6);
});

test('save, list newest first, duplicate and delete', async () => {
  const one = B.save(filled('First'));
  await new Promise(r => setTimeout(r, 5));
  const two = B.save(filled('Second'));
  assert.deepEqual(B.all().map(b => b.title), ['Second', 'First']);
  const copy = B.duplicate(two);
  assert.notEqual(copy.id, two.id);
  assert.equal(copy.title, 'Second (copy)');
  B.remove(one.id);
  assert.equal(B.get(one.id), null);
  assert.equal(B.all().length, 2);
});

test('saving the same board again updates it instead of adding a new one', () => {
  const b = B.save(filled('Edit me'));
  const before = B.all().length;
  b.title = 'Edited';
  B.save(b);
  assert.equal(B.all().length, before);
  assert.equal(B.get(b.id).title, 'Edited');
});
