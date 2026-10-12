/* ==========================================================================
   TRIVIA NIGHT · boards
   --------------------------------------------------------------------------
   One place that knows what a board looks like and where boards are kept.

   A board:
     { id, title, categories: [ { name, questions: [ { q, a } x5 ] } x6 ], updatedAt }
   Question values come from their row: 100, 200, 300, 400, 500.

   Where boards live (for now):
   - Built-in boards ship with the site (boards/*.js) and can't be edited.
   - Boards you make are saved in this browser. Step 4 moves them to an
     online library so they follow you to any device.
   ========================================================================== */

(function (root) {
  'use strict';

  var CATS = 6;
  var ROWS = 5;
  var STORE = 'trivia-night:boards';

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

  /* ---- Storage (browser). Every call is wrapped: storage can be blocked. ---- */

  function readSaved() {
    try {
      var list = JSON.parse(root.localStorage.getItem(STORE) || '[]');
      return Array.isArray(list) ? list.map(normalize) : [];
    } catch (e) { return []; }
  }
  function writeSaved(list) {
    try { root.localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  function builtIn() {
    return (root.TRIVIA_BOARDS || []).map(function (b) {
      var n = normalize(b);
      n.id = b.id;
      n.builtIn = true;
      return n;
    });
  }

  // Saved boards (newest first), then built-in ones.
  function all() {
    var saved = readSaved().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return saved.concat(builtIn());
  }
  function get(id) {
    return all().filter(function (b) { return b.id === id; })[0] || null;
  }
  function save(board) {
    var b = normalize(board);
    b.updatedAt = Date.now();
    var list = readSaved().filter(function (x) { return x.id !== b.id; });
    list.push(b);
    return writeSaved(list) ? b : null;
  }
  function remove(id) {
    return writeSaved(readSaved().filter(function (x) { return x.id !== id; }));
  }
  // A new editable copy (used to edit a built-in board).
  function duplicate(board, title) {
    var b = normalize(JSON.parse(JSON.stringify(board)));
    b.id = newId();
    b.title = str(title || board.title + ' (copy)', 60);
    return save(b);
  }

  // For the game: the board in the shape the rules engine expects.
  function toGame(board) {
    return { id: board.id, title: board.title, categories: board.categories };
  }

  var api = {
    CATS: CATS, ROWS: ROWS,
    blank: blank, normalize: normalize, check: check,
    all: all, get: get, save: save, remove: remove, duplicate: duplicate, toGame: toGame
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriviaBoards = api;
})(typeof window !== 'undefined' ? window : globalThis);
