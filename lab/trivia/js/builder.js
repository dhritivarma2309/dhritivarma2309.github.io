/* ==========================================================================
   TRIVIA NIGHT · board builder
   --------------------------------------------------------------------------
   Type categories, questions and answers into the 6 x 5 grid. Every change
   saves itself. A board can be played once all 30 questions have answers.
   Built-in boards can't be edited; make a copy first.
   ========================================================================== */

(function () {
  'use strict';

  var B = window.TriviaBoards;
  var SEL = 'trivia-night:builder-selected';
  var PICK = 'trivia-night:pick';
  var root = document.getElementById('builder');

  var board = null;        // the board being edited (a copy)
  var saveTimer = null;
  var status = 'saved';    // saved | saving | failed
  var confirming = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  function open(id) {
    var found = B.get(id) || B.all()[0] || B.blank();
    board = JSON.parse(JSON.stringify(found));
    confirming = false;
    store(SEL, board.id);
    render();
  }

  // ---- Saving: a short pause after the last keystroke ----
  function queueSave() {
    status = 'saving';
    drawStatus();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if (!board || board.builtIn) return;
    var saved = B.save(board);
    status = saved ? 'saved' : 'failed';
    if (saved) board.updatedAt = saved.updatedAt;
    drawStatus();
    drawList();
  }
  window.addEventListener('pagehide', function () { if (status === 'saving') saveNow(); });

  // ---- Actions ----
  var actions = {
    open: function (el) { if (status === 'saving') saveNow(); open(el.getAttribute('data-id')); },
    'new': function () {
      if (status === 'saving') saveNow();
      var b = B.save(B.blank('Untitled board'));
      if (b) open(b.id);
    },
    copy: function () {
      if (status === 'saving') saveNow();
      var b = B.duplicate(board);
      if (b) open(b.id);
    },
    'delete': function () {
      if (!confirming) {
        confirming = true;
        drawActions();
        setTimeout(function () { confirming = false; drawActions(); }, 4000);
        return;
      }
      clearTimeout(saveTimer);
      B.remove(board.id);
      store(SEL, '');
      open(null);
    },
    play: function () {
      if (status === 'saving') saveNow();
      store(PICK, board.id);
      location.href = '../';
    },
    'export': function () {
      var data = JSON.stringify(B.normalize(board), null, 2);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = (board.title || 'board').replace(/[^\w-]+/g, '-').toLowerCase() + '.trivia.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    'import': function () { root.querySelector('#import-file').click(); }
  };

  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) fn(el);
  });

  // Typing: change the board in place and save, without redrawing the grid.
  root.addEventListener('input', function (e) {
    var t = e.target;
    if (!board || board.builtIn) return;
    var field = t.getAttribute('data-field');
    if (!field) return;
    var c = +t.getAttribute('data-c'), r = +t.getAttribute('data-r');
    if (field === 'title') board.title = t.value;
    else if (field === 'cat') board.categories[c].name = t.value;
    else board.categories[c].questions[r][field] = t.value;
    if (field === 'q' || field === 'a') {
      var item = board.categories[c].questions[r];
      var cell = t.closest('.bb-cell');
      if (cell) cell.classList.toggle('is-done', !!(item.q.trim() && item.a.trim()));
    }
    queueSave();
    drawProgress();
  });

  root.addEventListener('change', function (e) {
    if (e.target.id !== 'import-file') return;
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var msg = root.querySelector('[data-slot="import-msg"]');
      try {
        var b = B.normalize(JSON.parse(reader.result));
        if (B.get(b.id)) b.id = B.blank().id;  // never overwrite a board you already have
        var saved = B.save(b);
        if (saved) open(saved.id);
      } catch (err) {
        if (msg) msg.textContent = 'That file isn\'t a Trivia Night board. Export one from here to see the format.';
      }
    };
    reader.readAsText(file);
  });

  // ---- Drawing ----
  function render() {
    root.innerHTML =
      '<div class="bb-layout">' +
        '<aside class="bb-side"><div data-slot="list"></div>' +
          '<div class="bb-side-actions"><button class="btn btn--solid btn--sm" type="button" data-act="new">+ New board</button>' +
          '<button class="tn-link-btn" type="button" data-act="import">Import a board file</button>' +
          '<input type="file" id="import-file" accept=".json,application/json" hidden>' +
          '<p class="tn-hint" data-slot="import-msg"></p></div>' +
          '<p class="tn-hint bb-note">Boards are saved in this browser for now. Export a board to back it up or move it to another device.</p>' +
        '</aside>' +
        '<section class="bb-main">' + renderEditor() + '</section>' +
      '</div>';
    drawList();
    drawActions();
    drawProgress();
    drawStatus();
  }

  function renderEditor() {
    var ro = board.builtIn;
    var dis = ro ? ' disabled' : '';
    var cats = board.categories.map(function (cat, c) {
      var cells = cat.questions.map(function (item, r) {
        var done = item.q.trim() && item.a.trim();
        var id = 'q-' + c + '-' + r;
        return '<div class="bb-cell' + (done ? ' is-done' : '') + '">' +
          '<span class="bb-value">' + (r + 1) * 100 + '</span>' +
          '<label class="sr-only" for="' + id + '">' + esc(cat.name || 'Category ' + (c + 1)) + ' ' + (r + 1) * 100 + ' question</label>' +
          '<textarea id="' + id + '" class="bb-q" rows="3" maxlength="300" placeholder="Question" data-field="q" data-c="' + c + '" data-r="' + r + '"' + dis + '>' + esc(item.q) + '</textarea>' +
          '<label class="sr-only" for="a-' + c + '-' + r + '">Answer</label>' +
          '<input id="a-' + c + '-' + r + '" class="bb-a" maxlength="120" placeholder="Answer" autocomplete="off" data-field="a" data-c="' + c + '" data-r="' + r + '" value="' + esc(item.a) + '"' + dis + '>' +
        '</div>';
      }).join('');
      return '<div class="bb-cat">' +
        '<label class="sr-only" for="cat-' + c + '">Category ' + (c + 1) + ' name</label>' +
        '<input id="cat-' + c + '" class="bb-cat-name" maxlength="40" placeholder="Category ' + (c + 1) + '" autocomplete="off" data-field="cat" data-c="' + c + '" value="' + esc(cat.name) + '"' + dis + '>' +
        cells + '</div>';
    }).join('');
    return '<div class="bb-head">' +
        '<label class="sr-only" for="board-title">Board name</label>' +
        '<input id="board-title" class="bb-title" maxlength="60" placeholder="Name this board" autocomplete="off" data-field="title" value="' + esc(board.title) + '"' + dis + '>' +
        '<div class="bb-actions" data-slot="actions"></div>' +
      '</div>' +
      (ro ? '<p class="bb-banner">This board comes with the site, so it can\'t be changed. Make a copy to edit it.</p>' : '') +
      '<div class="bb-progress" data-slot="progress"></div>' +
      '<div class="bb-grid">' + cats + '</div>';
  }

  function drawList() {
    var slot = root.querySelector('[data-slot="list"]');
    if (!slot) return;
    var boards = B.all();
    var mine = boards.filter(function (b) { return !b.builtIn; });
    var builtIn = boards.filter(function (b) { return b.builtIn; });
    function item(b) {
      var c = B.check(b.id === board.id ? board : b);
      return '<li><button type="button" class="bb-item' + (b.id === board.id ? ' is-current' : '') + '" data-act="open" data-id="' + esc(b.id) + '"' + (b.id === board.id ? ' aria-current="true"' : '') + '>' +
        '<span class="bb-item-name">' + esc((b.id === board.id ? board.title : b.title) || 'Untitled board') + '</span>' +
        '<span class="bb-item-meta' + (c.ready ? ' is-ready' : '') + '">' + (c.ready ? 'Ready to play' : c.filled + ' of ' + c.total + ' filled') + '</span>' +
      '</button></li>';
    }
    slot.innerHTML =
      '<h2 class="tn-card-title">Your boards</h2>' +
      (mine.length ? '<ul class="bb-list">' + mine.map(item).join('') + '</ul>' : '<p class="tn-hint">No boards yet. Start a new one, or copy the sample.</p>') +
      (builtIn.length ? '<h3 class="bb-sub">Comes with the site</h3><ul class="bb-list">' + builtIn.map(item).join('') + '</ul>' : '');
  }

  function drawActions() {
    var slot = root.querySelector('[data-slot="actions"]');
    if (!slot) return;
    var ready = B.check(board).ready;
    slot.innerHTML =
      '<button class="btn btn--solid btn--sm" type="button" data-act="play"' + (ready ? '' : ' disabled title="Fill in every question and answer first"') + '>Play this board</button>' +
      '<button class="btn btn--sm" type="button" data-act="copy">' + (board.builtIn ? 'Make a copy to edit' : 'Duplicate') + '</button>' +
      '<button class="btn btn--sm" type="button" data-act="export">Export</button>' +
      (board.builtIn ? '' : '<button class="btn btn--sm' + (confirming ? ' is-armed' : '') + '" type="button" data-act="delete">' + (confirming ? 'Tap again to delete' : 'Delete') + '</button>');
  }

  function drawProgress() {
    var slot = root.querySelector('[data-slot="progress"]');
    if (!slot) return;
    var c = B.check(board);
    var wasReady = slot.getAttribute('data-ready') === '1';
    slot.setAttribute('data-ready', c.ready ? '1' : '0');
    slot.innerHTML =
      '<div class="bb-progress-top"><span class="bb-count">' + c.filled + ' of ' + c.total + ' questions ready</span>' +
        '<span class="bb-status" data-slot="status"></span></div>' +
      '<span class="bb-bar" aria-hidden="true"><span style="width:' + (c.filled / c.total * 100) + '%"></span></span>' +
      (c.ready ? '<p class="bb-ready">This board is ready to play.</p>'
        : '<details class="bb-missing"><summary>What\'s left (' + c.missing.length + ')</summary><ul>' +
          c.missing.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></details>');
    drawStatus();
    if (wasReady !== c.ready) drawActions();
    var cur = root.querySelector('.bb-item.is-current');
    if (cur) {
      cur.querySelector('.bb-item-name').textContent = board.title || 'Untitled board';
      var meta = cur.querySelector('.bb-item-meta');
      meta.textContent = c.ready ? 'Ready to play' : c.filled + ' of ' + c.total + ' filled';
      meta.classList.toggle('is-ready', c.ready);
    }
  }

  function drawStatus() {
    var el = root.querySelector('[data-slot="status"]');
    if (!el) return;
    if (board.builtIn) { el.textContent = 'Read only'; el.className = 'bb-status'; return; }
    el.textContent = status === 'saving' ? 'Saving…' : status === 'failed' ? 'Couldn\'t save in this browser' : 'Saved';
    el.className = 'bb-status is-' + status;
  }

  open(store(SEL));
})();
