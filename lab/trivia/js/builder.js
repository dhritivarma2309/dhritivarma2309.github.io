/* ==========================================================================
   TRIVIA NIGHT · board builder
   --------------------------------------------------------------------------
   Sign in with Google, then type categories, questions and answers into the
   6 x 5 grid. Every change saves itself to your board library (online, so
   it follows you to any device). A board can be played once all 30
   questions have answers. Built-in boards can't be edited; make a copy.
   ========================================================================== */

(function () {
  'use strict';

  var B = window.TriviaBoards;
  var Live = window.TriviaLive;
  var SEL = 'trivia-night:builder-selected';
  var PICK = 'trivia-night:pick';
  var root = document.getElementById('builder');

  var board = null;        // the board being edited (a copy)
  var saveTimer = null;
  var status = 'saved';    // saved | saving | failed
  var confirming = false;
  var account = { ready: false, error: '', busy: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function signedIn() { return !!B.status().user; }
  function editable() { return board && !board.builtIn && signedIn(); }

  // Pick a board to show without you clicking one. Signed in: only your own
  // boards (the last one you had open, else your newest); with none yet, an
  // empty page. Signed out: the sample, read-only.
  function autoOpen() {
    var sel = store(SEL);
    if (signedIn()) {
      var mine = B.all().filter(function (b) { return !b.builtIn; });
      var pick = mine.filter(function (b) { return b.id === sel; })[0] || mine[0];
      if (pick) open(pick.id); else { board = null; render(); }
      return;
    }
    open(sel);
  }

  function open(id) {
    var found = B.get(id) || B.all()[0] || B.blank();
    board = JSON.parse(JSON.stringify(found));
    delete board.saved;
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
    if (!editable()) return;
    var saved = B.save(board);
    if (!saved) { status = 'failed'; drawStatus(); return; }
    board.updatedAt = saved.updatedAt;
    saved.saved.then(function () {
      if (status === 'saving') { status = 'saved'; drawStatus(); }
    }, function () { status = 'failed'; drawStatus(); });
  }
  window.addEventListener('pagehide', function () { if (status === 'saving') saveNow(); });

  // ---- Signing in ----
  function signIn() {
    account.busy = true; account.error = ''; drawAccount();
    Live.signIn().catch(function (e) { account.error = e.message; })
      .then(function () { account.busy = false; drawAccount(); });
  }

  // ---- Actions ----
  var actions = {
    open: function (el) { if (status === 'saving') saveNow(); open(el.getAttribute('data-id')); },
    'sign-in': signIn,
    'sign-out': function () { if (status === 'saving') saveNow(); Live.signOut(); },
    'new': function () {
      if (!signedIn()) { signIn(); return; }
      if (status === 'saving') saveNow();
      var b = B.save(B.blank('Untitled board'));
      if (b) open(b.id);
    },
    'copy-sample': function () {
      var sample = B.all().filter(function (b) { return b.builtIn; })[0];
      if (!sample || !signedIn()) return;
      var b = B.duplicate(sample);
      if (b) open(b.id);
    },
    copy: function () {
      if (!signedIn()) { signIn(); return; }
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
      status = 'saved';
      B.remove(board.id);
      store(SEL, '');
      autoOpen();
    },
    play: function () {
      if (status === 'saving') saveNow();
      store(PICK, board.id);
      location.href = '../host/';
    }
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
    if (!editable()) return;
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

  // The library changed: it loaded, you signed in or out, or a save landed.
  var lastUser;         // undefined until we first hear who's signed in
  var reopen = false;   // pick a board once the library has loaded
  B.onChange(function () {
    var st = B.status();
    var who = st.user ? st.user.uid : null;
    if (who !== lastUser) { lastUser = who; reopen = true; }
    if (reopen && !st.loading) { reopen = false; autoOpen(); return; }
    if (reopen) { render(); return; }                 // still loading
    if (board && !board.builtIn && !B.get(board.id) && status !== 'saving') { autoOpen(); return; }  // deleted elsewhere
    drawList();
    drawAccount();
  });

  // ---- Drawing ----
  function render() {
    root.innerHTML =
      '<div class="bb-layout">' +
        '<aside class="bb-side"><div data-slot="account"></div><div data-slot="list"></div>' +
          '<div class="bb-side-actions"><button class="btn btn--solid btn--sm" type="button" data-act="new">+ New board</button></div>' +
        '</aside>' +
        '<section class="bb-main">' + (board ? renderEditor() : renderEmpty()) + '</section>' +
      '</div>';
    drawAccount();
    drawList();
    drawActions();
    drawProgress();
    drawStatus();
  }

  function drawAccount() {
    var slot = root.querySelector('[data-slot="account"]');
    if (!slot) return;
    var st = B.status();
    var err = account.error ? '<p class="tn-error" role="alert">' + esc(account.error) + '</p>' : '';
    if (!account.ready) {
      slot.innerHTML = '<div class="bb-account"><p class="tn-hint">Connecting…</p>' + err + '</div>';
    } else if (!st.user) {
      slot.innerHTML = '<div class="bb-account is-out">' +
        '<p class="bb-account-title">Sign in to build boards</p>' +
        '<p class="tn-hint">Your boards save to your Google account, so you can write them on one device and host from another. Only you can see them.</p>' +
        '<button class="btn btn--solid btn--sm" type="button" data-act="sign-in"' + (account.busy ? ' disabled' : '') + '>' + (account.busy ? 'Signing in…' : 'Sign in with Google') + '</button>' + err + '</div>';
    } else {
      slot.innerHTML = '<div class="bb-account">' +
        '<p class="tn-hint">Signed in as <b>' + esc(st.user.name) + '</b> · <button class="tn-link-btn tn-inline" type="button" data-act="sign-out">Sign out</button></p>' +
        (st.moved ? '<p class="tn-hint">Moved ' + st.moved + (st.moved === 1 ? ' board' : ' boards') + ' from this browser into your library.</p>' : '') +
        (st.error ? '<p class="tn-error" role="alert">' + esc(st.error) + '</p>' : '') +
        err + '</div>';
    }
  }

  // Signed in, library loading or no boards yet.
  function renderEmpty() {
    var st = B.status();
    if (lastUser === undefined || st.loading) return '<div class="bb-empty"><p class="tn-hint">Loading your boards…</p></div>';
    return '<div class="bb-empty paper tape">' +
      '<h2 class="display bb-empty-title">Start your first board</h2>' +
      '<p class="tn-hint">Six categories, five questions each. Everything saves to your library as you type.</p>' +
      '<div class="bb-actions"><button class="btn btn--solid btn--sm" type="button" data-act="new">+ New board</button>' +
      '<button class="btn btn--sm" type="button" data-act="copy-sample">Copy the sample to start</button></div></div>';
  }

  function renderEditor() {
    var ro = !editable();
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
    var banner = board.builtIn
      ? '<p class="bb-banner">This board comes with the site, so it can\'t be changed. ' + (signedIn() ? 'Make a copy to edit it.' : 'Sign in, then make a copy to edit it.') + '</p>'
      : '';
    return '<div class="bb-head">' +
        '<label class="sr-only" for="board-title">Board name</label>' +
        '<input id="board-title" class="bb-title" maxlength="60" placeholder="Name this board" autocomplete="off" data-field="title" value="' + esc(board.title) + '"' + dis + '>' +
        '<div class="bb-actions" data-slot="actions"></div>' +
      '</div>' + banner +
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
      var cur = !!board && b.id === board.id;
      var c = B.check(cur ? board : b);
      return '<li><button type="button" class="bb-item' + (cur ? ' is-current' : '') + '" data-act="open" data-id="' + esc(b.id) + '"' + (cur ? ' aria-current="true"' : '') + '>' +
        '<span class="bb-item-name">' + esc((cur ? board.title : b.title) || 'Untitled board') + '</span>' +
        '<span class="bb-item-meta' + (c.ready ? ' is-ready' : '') + '">' + (c.ready ? 'Ready to play' : c.filled + ' of ' + c.total + ' filled') + '</span>' +
      '</button></li>';
    }
    var st = B.status();
    var yours = !st.user ? ''
      : st.loading ? '<p class="tn-hint">Loading your boards…</p>'
      : mine.length ? '<ul class="bb-list">' + mine.map(item).join('') + '</ul>'
      : '<p class="tn-hint">No boards yet. Start a new one, or copy the sample.</p>';
    slot.innerHTML =
      (st.user ? '<h2 class="tn-card-title">Your boards</h2>' + yours : '') +
      (builtIn.length ? '<h3 class="bb-sub">Comes with the site</h3><ul class="bb-list">' + builtIn.map(item).join('') + '</ul>' : '');
  }

  function drawActions() {
    var slot = root.querySelector('[data-slot="actions"]');
    if (!slot || !board) return;
    var ready = B.check(board).ready;
    slot.innerHTML =
      '<button class="btn btn--solid btn--sm" type="button" data-act="play"' + (ready ? '' : ' disabled title="Fill in every question and answer first"') + '>Play this board</button>' +
      (signedIn() ? '<button class="btn btn--sm" type="button" data-act="copy">' + (board.builtIn ? 'Make a copy to edit' : 'Duplicate') + '</button>' : '') +
      (editable() ? '<button class="btn btn--sm' + (confirming ? ' is-armed' : '') + '" type="button" data-act="delete">' + (confirming ? 'Tap again to delete' : 'Delete') + '</button>' : '');
  }

  function drawProgress() {
    var slot = root.querySelector('[data-slot="progress"]');
    if (!slot || !board) return;
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
    if (!el || !board) return;
    if (!editable()) { el.textContent = 'Read only'; el.className = 'bb-status'; return; }
    el.textContent = status === 'saving' ? 'Saving…' : status === 'failed' ? 'Couldn\'t save. Check your connection.' : 'Saved to your library';
    el.className = 'bb-status is-' + status;
  }

  // Start: wait to hear who's signed in before opening a board, so the
  // sample never flashes up for someone who's signed in.
  board = null;
  render();
  Live.connect().then(function (ctx) {
    account.ready = true;
    B.attach(ctx);
    drawAccount();
  }, function (e) {
    account.ready = true;
    account.error = e.message;
    lastUser = null;
    autoOpen();
  });
})();
