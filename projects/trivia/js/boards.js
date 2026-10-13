/* ==========================================================================
   TRIVIA NIGHT · boards
   --------------------------------------------------------------------------
   One place that knows what a board looks like and where boards are kept.

   A board:
     { id, title, categories: [ { name, questions: [ { q, a } x5 ] } x6 ], updatedAt }
   Question values come from their row: 100, 200, 300, 400, 500.

   Where boards live:
   - Built-in boards ship with the site (boards/*.js) and can't be edited.
   - Boards you make are saved to your account (sign in with Google), so
     they follow you to any device. Only you can read or change them.
   ========================================================================== */

(function (root) {
  'use strict';

  var CATS = 6;
  var ROWS = 5;

  function str(v, max) { return String(v == null ? '' : v).slice(0, max); }

  // An empty 6 x 5 board.
  function blank(title) {
    var cats = [];
    for (var c = 0; c < CATS; c++) {
      var qs = [];
      for (var r = 0; r < ROWS; r++) qs.push({ q: '', a: '' });
      cats.push({ name: '', questions: qs });
    }
    return { id: newId(), title: title || '', categories: cats, updatedAt: 0 };
  }

  function newId() {
    return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Bring any board-shaped object (e.g. one read back from storage) into the exact
  // 6 x 5 shape, trimming over-long text. Missing pieces become blanks.
  function normalize(input) {
    var b = blank();
    if (!input || typeof input !== 'object') return b;
    b.id = typeof input.id === 'string' && /^[\w-]{1,40}$/.test(input.id) ? input.id : b.id;
    b.title = str(input.title, 60);
    b.updatedAt = +input.updatedAt || 0;
    var cats = Array.isArray(input.categories) ? input.categories : [];
    for (var c = 0; c < CATS; c++) {
      var src = cats[c] || {};
      b.categories[c].name = str(src.name, 40);
      var qs = Array.isArray(src.questions) ? src.questions : [];
      for (var r = 0; r < ROWS; r++) {
        var item = qs[r] || {};
        b.categories[c].questions[r] = { q: str(item.q, 300), a: str(item.a, 120) };
      }
    }
    return b;
  }

  // How complete a board is: { filled, total, missing: [plain-language notes], ready }
  function check(board) {
    var missing = [];
    var filled = 0;
    var total = CATS * ROWS;
    if (!board.title.trim()) missing.push('Give the board a name.');
    board.categories.forEach(function (cat, c) {
      var label = cat.name.trim() || 'Category ' + (c + 1);
      if (!cat.name.trim()) missing.push('Category ' + (c + 1) + ' needs a name.');
      var gaps = [];
      cat.questions.forEach(function (item, r) {
        var ok = item.q.trim() && item.a.trim();
        if (ok) filled++;
        else gaps.push((r + 1) * 100);
      });
      if (gaps.length) missing.push(label + ': ' + gaps.join(', ') + (gaps.length === 1 ? ' needs' : ' need') + ' a question and answer.');
    });
    return { filled: filled, total: total, missing: missing, ready: missing.length === 0 };
  }

  /* ---- Where boards are kept --------------------------------------------
     Your boards live in your account (Firebase, boards/<your id>/<board id>)
     once you sign in with Google. A copy is kept in memory so pages can
     list and open boards instantly; every change is written through to
     Firebase. Boards made before sign-in existed were kept in this browser;
     they move into your library the first time you sign in.
     ---------------------------------------------------------------------- */

  var cache = {};             // board id -> board (your library)
  var store = null;           // { put(board) -> Promise, del(id) -> Promise }
  var state = { user: null, loading: false, moved: 0, error: '' };
  var listeners = [];

  function changed() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } }); }
  function onChange(fn) { listeners.push(fn); }
  function status() { return { user: state.user, loading: state.loading, moved: state.moved, error: state.error }; }

  function builtIn() {
    return (root.TRIVIA_BOARDS || []).map(function (b) {
      var n = normalize(b);
      n.id = b.id;
      n.builtIn = true;
      return n;
    });
  }

  // Your boards (newest first), then built-in ones.
  function all() {
    var mine = Object.keys(cache).map(function (k) { return cache[k]; })
      .sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return mine.concat(builtIn());
  }
  function get(id) {
    return all().filter(function (b) { return b.id === id; })[0] || null;
  }
  function canSave() { return !!store; }

  // Returns the saved board right away; `.saved` is a Promise for the write.
  function save(board) {
    if (!store) return null;
    var b = normalize(board);
    b.updatedAt = Date.now();
    cache[b.id] = b;
    b.saved = store.put(stripped(b));
    changed();
    return b;
  }
  function remove(id) {
    if (!store) return Promise.resolve(false);
    delete cache[id];
    changed();
    return store.del(id);
  }
  // A new editable copy (used to edit a built-in board).
  function duplicate(board, title) {
    var b = normalize(JSON.parse(JSON.stringify(board)));
    b.id = newId();
    b.title = str(title || board.title + ' (copy)', 60);
    return save(b);
  }
  function stripped(b) {
    return { id: b.id, title: b.title, categories: b.categories, updatedAt: b.updatedAt };
  }

  // For the game: the board in the shape the rules engine expects.
  function toGame(board) {
    return { id: board.id, title: board.title, categories: board.categories };
  }

  /* ---- Connecting the library to an account ---------------------------- */

  // Any store with list/put/del works (the tests use one kept in memory).
  // list(onBoards) calls onBoards({ id: board, ... }) now and on every change.
  function useStore(s, user) {
    if (store && store.stop) store.stop();
    cache = {};
    store = s;
    state.user = user || null;
    state.loading = !!s;
    state.error = '';
    if (!s) { state.loading = false; changed(); return; }
    var first = true;
    s.list(function (boards) {
      var next = {};
      Object.keys(boards || {}).forEach(function (k) {
        var b = normalize(boards[k]);
        b.id = k;
        next[k] = b;
      });
      cache = next;
      state.loading = false;
      if (first) { first = false; moveBrowserBoards(); }
      changed();
    }, function () {
      // Usually the database rules haven't been updated for the library yet.
      state.loading = false;
      state.error = 'Couldn\'t load your boards. The library may not be switched on in Firebase yet.';
      changed();
    });
  }

  // Firebase: boards/<uid>. Follows sign-in and sign-out.
  function attach(ctx) {
    ctx.onAuth(function (user) {
      if (!user) { useStore(null, null); return; }
      if (state.user && state.user.uid === user.uid && store) return;
      var ref = ctx.db.ref('boards/' + user.uid);
      var handler = function (snap) { listFn(snap.val() || {}); };
      var listFn = function () {};
      useStore({
        list: function (fn, onError) { listFn = fn; ref.on('value', handler, onError); },
        put: function (b) { return ref.child(b.id).set(b); },
        del: function (id) { return ref.child(id).remove(); },
        stop: function () { ref.off('value', handler); }
      }, user);
    });
  }

  // Boards saved in this browser before the online library: move them in once.
  var OLD_STORE = 'trivia-night:boards';
  function moveBrowserBoards() {
    var old = [];
    try { old = JSON.parse(root.localStorage.getItem(OLD_STORE) || '[]'); } catch (e) { return; }
    if (!Array.isArray(old) || !old.length) return;
    var moved = 0;
    old.forEach(function (raw) {
      var b = normalize(raw);
      if (cache[b.id]) b.id = newId();
      b.updatedAt = b.updatedAt || Date.now();
      cache[b.id] = b;
      store.put(stripped(b));
      moved++;
    });
    try { root.localStorage.removeItem(OLD_STORE); } catch (e) { /* ignore */ }
    state.moved = moved;
  }

  var api = {
    CATS: CATS, ROWS: ROWS,
    blank: blank, normalize: normalize, check: check,
    all: all, get: get, save: save, remove: remove, duplicate: duplicate, toGame: toGame,
    canSave: canSave, status: status, onChange: onChange, useStore: useStore, attach: attach
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriviaBoards = api;
})(typeof window !== 'undefined' ? window : globalThis);
