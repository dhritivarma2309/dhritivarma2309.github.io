// Tests for board storage and checks. Run from the repo root:  node --test lab/trivia/tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

// A stand-in for the browser's storage.
const mem = {};
globalThis.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
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

test('any stored board is forced into the 6 x 5 shape', () => {
  const b = B.normalize({ title: 'X'.repeat(200), categories: [{ name: 'Only one', questions: [{ q: 'Hi', a: 'There' }] }], extra: 'ignored' });
  assert.equal(b.title.length, 60);
  assert.equal(b.categories.length, 6);
  assert.equal(b.categories[0].questions[0].a, 'There');
  assert.equal(b.categories[5].questions[4].q, '');
  assert.equal(B.normalize(null).categories.length, 6);
});

// A stand-in for the Firebase library, kept in memory.
function memoryStore() {
  const data = {};
  let notify = () => {};
  return {
    data,
    list(fn) { notify = fn; fn(JSON.parse(JSON.stringify(data))); },
    put(b) { data[b.id] = JSON.parse(JSON.stringify(b)); notify(JSON.parse(JSON.stringify(data))); return Promise.resolve(); },
    del(id) { delete data[id]; notify(JSON.parse(JSON.stringify(data))); return Promise.resolve(); }
  };
}

test('nothing can be saved until you sign in', () => {
  B.useStore(null, null);
  assert.equal(B.canSave(), false);
  assert.equal(B.save(filled('Nope')), null);
});

test('save, list newest first, duplicate and delete (in your online library)', async () => {
  const store = memoryStore();
  B.useStore(store, { uid: 'dhriti', name: 'Dhriti' });
  const one = B.save(filled('First'));
  await new Promise(r => setTimeout(r, 5));
  const two = B.save(filled('Second'));
  assert.deepEqual(B.all().filter(b => !b.builtIn).map(b => b.title), ['Second', 'First']);
  assert.equal(store.data[two.id].title, 'Second', 'written through to the library');
  assert.ok(!('saved' in store.data[two.id]), 'only board fields are stored');
  const copy = B.duplicate(two);
  assert.notEqual(copy.id, two.id);
  assert.equal(copy.title, 'Second (copy)');
  await B.remove(one.id);
  assert.equal(B.get(one.id), null);
  assert.equal(store.data[one.id], undefined);
});

test('saving the same board again updates it instead of adding a new one', () => {
  const store = memoryStore();
  B.useStore(store, { uid: 'dhriti' });
  const b = B.save(filled('Edit me'));
  b.title = 'Edited';
  B.save(b);
  assert.equal(Object.keys(store.data).length, 1);
  assert.equal(B.get(b.id).title, 'Edited');
});

test('boards saved in this browser move into the library on first sign-in, once', () => {
  mem['trivia-night:boards'] = JSON.stringify([filled('Old browser board')]);
  const store = memoryStore();
  B.useStore(store, { uid: 'dhriti' });
  assert.equal(B.status().moved, 1);
  assert.deepEqual(Object.values(store.data).map(b => b.title), ['Old browser board']);
  assert.equal(mem['trivia-night:boards'], undefined, 'removed from the browser after moving');
});

test('signing out empties the list (built-in boards stay)', () => {
  globalThis.TRIVIA_BOARDS.push({ id: 'sample', title: 'Sample', categories: [] });
  B.useStore(memoryStore(), { uid: 'dhriti' });
  B.save(filled('Mine'));
  B.useStore(null, null);
  assert.deepEqual(B.all().map(b => b.title), ['Sample']);
  assert.equal(B.status().user, null);
});
