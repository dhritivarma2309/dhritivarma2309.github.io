/* ==========================================================================
   TRIVIA NIGHT · board builder
   --------------------------------------------------------------------------
   Two screens:
   - Your boards: start a new board, or open one you've made. The sample
     that comes with the site sits underneath.
   - Editing a board: the 6 x 5 grid. Every change saves itself to your
     library (online, so it follows you to any device). A board can be
     played once all 30 questions have answers.
   Building needs a Google sign-in; signed out, you can still look at the
   sample. The address ends in #<board id> while editing, so the browser's
   Back button returns to Your boards.
   ========================================================================== */

(function () {
  'use strict';

  var B = window.TriviaBoards;
  var Live = window.TriviaLive;
  var PICK = 'trivia-night:pick';
  var root = document.getElementById('builder');

  var board = null;        // the board being edited (a copy), or null on Your boards
  var saveTimer = null;
  var status = 'saved';    // saved | saving | failed
  var confirming = false;
  var account = { ready: false, error: '', busy: false };
  var heard = false;       // have we heard who's signed in yet?

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function signedIn() { return !!B.status().user; }
  function editable() { return board && !board.builtIn && signedIn(); }
  function progress(b) {
    var c = B.check(b);
    return c.ready ? 'Ready to play' : c.filled + ' of ' + c.total + ' questions';
  }
  function ago(t) {
    if (!t) return '';
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'Edited just now';
    if (m < 60) return 'Edited ' + m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return 'Edited ' + h + (h === 1 ? ' hour' : ' hours') + ' ago';
    return 'Edited ' + new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* ---- Moving between the two screens --------------------------------- */

  function edit(id) {
    var found = B.get(id);
    if (!found) { home(); return; }
    board = JSON.parse(JSON.stringify(found));
    delete board.saved;
    confirming = false;
    status = 'saved';
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    render();
    window.scrollTo(0, 0);
  }
  function home() {
    if (status === 'saving') saveNow();
    board = null;
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    render();
  }
  // Browser Back / Forward.
  window.addEventListener('popstate', function () {
    var id = location.hash.slice(1);
    if (status === 'saving') saveNow();
    if (id && B.get(id)) edit(id); else { board = null; render(); }
  });

  /* ---- Saving: a short pause after the last keystroke ------------------- */

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

  /* ---- Actions ---------------------------------------------------------- */

  function signIn() {
    account.busy = true; account.error = ''; render();
    Live.signIn().catch(function (e) { account.error = e.message; })
      .then(function () { account.busy = false; render(); });
  }

  var actions = {
    'sign-in': signIn,
    'sign-out': function () { if (status === 'saving') saveNow(); board = null; Live.signOut(); },
    open: function (el) { edit(el.getAttribute('data-id')); },
    home: home,
    'new': function () {
      if (!signedIn()) { signIn(); return; }
      var b = B.save(B.blank('Untitled board'));
      if (b) edit(b.id);
    },
    copy: function (el) {
      if (!signedIn()) { signIn(); return; }
      if (status === 'saving') saveNow();
      if (!board || board.builtIn) return;  // only your own boards can be duplicated
      var b = B.duplicate(board);
      if (b) edit(b.id);
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
      home();
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
    if (fn) { e.preventDefault(); fn(el); }
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
  var lastUser;
  B.onChange(function () {
    var st = B.status();
    var who = st.user ? st.user.uid : null;
    if (who !== lastUser) {
      lastUser = who;
      heard = true;
      // Signed out while editing your board: back to Your boards.
      if (board && !board.builtIn && !who) board = null;
    }
    if (st.loading) { if (!board) render(); return; }
    // Arrived with #<board id> in the address: open it once your boards load.
    var want = location.hash.slice(1);
    if (!board && want && B.get(want)) { edit(want); return; }
    if (board && !board.builtIn && !B.get(board.id) && status !== 'saving') { home(); return; }  // deleted elsewhere
    if (!board) render();
  });

  /* ---- Drawing ---------------------------------------------------------- */

  function render() {
    root.innerHTML = board ? renderEditor() : renderHome();
    if (board) { drawActions(); drawProgress(); }
  }

  function accountBar() {
    var st = B.status();
    if (!account.ready || !st.user) return '';
    return '<p class="bb-who">' + esc(st.user.name) + ' · <button class="tn-link-btn tn-inline" type="button" data-act="sign-out">Sign out</button></p>';
  }

  // Screen 1: Your boards.
  function renderHome() {
    var st = B.status();
    var mine = B.all().filter(function (b) { return !b.builtIn; });
    var site = B.all().filter(function (b) { return b.builtIn; });
    var err = account.error || st.error;

    var yours;
    if (!account.ready || !heard || (st.user && st.loading)) {
      yours = '<p class="tn-hint">Loading your boards…</p>';
    } else if (!st.user) {
      yours = '<div class="bb-signin paper">' +
        '<h2 class="bb-signin-title">Sign in to build your own boards</h2>' +
        '<p class="tn-hint">Boards save to your Google account, so you can write them on one device and host from another. Only you can see them.</p>' +
        '<button class="btn btn--solid" type="button" data-act="sign-in"' + (account.busy ? ' disabled' : '') + '>' + (account.busy ? 'Signing in…' : 'Sign in with Google') + '</button>' +
      '</div>';
    } else {
      yours = '<div class="bb-cards">' +
        '<button class="bb-card bb-card--new" type="button" data-act="new"><span class="bb-plus" aria-hidden="true">+</span><span class="bb-card-title">New board</span></button>' +
        mine.map(card).join('') +
      '</div>' +
      (st.moved ? '<p class="tn-hint">Moved ' + st.moved + (st.moved === 1 ? ' board' : ' boards') + ' from this browser into your library.</p>' : '');
    }

    return '<div class="bb-home">' +
      '<div class="bb-home-head"><h1 class="bb-section bb-section--first">Your boards</h1>' + accountBar() + '</div>' +
      (err ? '<p class="tn-error" role="alert">' + esc(err) + '</p>' : '') +
      yours +
      (site.length ? '<h2 class="bb-section">From the site</h2><div class="bb-cards">' + site.map(siteCard).join('') + '</div>' : '') +
    '</div>';
  }

  function card(b) {
    var ready = B.check(b).ready;
    return '<button class="bb-card" type="button" data-act="open" data-id="' + esc(b.id) + '">' +
      '<span class="bb-card-title">' + esc(b.title || 'Untitled board') + '</span>' +
      '<span class="bb-card-meta' + (ready ? ' is-ready' : '') + '">' + progress(b) + '</span>' +
      '<span class="bb-card-when">' + ago(b.updatedAt) + '</span>' +
    '</button>';
  }

  function siteCard(b) {
    return '<div class="bb-card bb-card--site">' +
      '<span class="bb-card-title">' + esc(b.title) + '</span>' +
      '<span class="bb-card-meta">' + b.categories.map(function (c) { return esc(c.name); }).join(' · ') + '</span>' +
      '<span class="bb-card-actions">' +
        '<button class="tn-link-btn tn-inline" type="button" data-act="open" data-id="' + esc(b.id) + '">Preview</button>' +
      '</span>' +
    '</div>';
  }

  // Screen 2: editing a board.
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
      ? '<p class="bb-banner">This sample comes with the site, so it can\'t be changed. Start a new board to make your own.</p>'
      : '';
    return '<div class="bb-edit">' +
      '<div class="bb-edit-top"><a class="bb-back" href="./" data-act="home">← All boards</a>' + accountBar() + '</div>' +
      '<div class="bb-head">' +
        '<label class="sr-only" for="board-title">Board name</label>' +
        '<input id="board-title" class="bb-title" maxlength="60" placeholder="Name this board" autocomplete="off" data-field="title" value="' + esc(board.title) + '"' + dis + '>' +
        '<div class="bb-actions" data-slot="actions"></div>' +
      '</div>' + banner +
      '<div class="bb-progress" data-slot="progress"></div>' +
      '<div class="bb-grid">' + cats + '</div>' +
    '</div>';
  }

  function drawActions() {
    var slot = root.querySelector('[data-slot="actions"]');
    if (!slot || !board) return;
    var ready = B.check(board).ready;
    slot.innerHTML =
      '<button class="btn btn--solid btn--sm" type="button" data-act="play"' + (ready ? '' : ' disabled title="Fill in every question and answer first"') + '>Play this board</button>' +
      (editable() ? '<button class="btn btn--sm" type="button" data-act="copy">Duplicate</button>' : '') +
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
  }

  function drawStatus() {
    var el = root.querySelector('[data-slot="status"]');
    if (!el || !board) return;
    if (!editable()) { el.textContent = 'Read only'; el.className = 'bb-status'; return; }
    el.textContent = status === 'saving' ? 'Saving…' : status === 'failed' ? 'Couldn\'t save. Check your connection.' : 'Saved to your library';
    el.className = 'bb-status is-' + status;
  }

  // Start on Your boards (or the board in the address), once we know who's signed in.
  render();
  Live.connect().then(function (ctx) {
    account.ready = true;
    B.attach(ctx);
  }, function (e) {
    account.ready = true;
    heard = true;
    account.error = e.message;
    var want = location.hash.slice(1);
    if (want && B.get(want)) edit(want); else render();
  });
})();
