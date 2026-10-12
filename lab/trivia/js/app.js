/* ==========================================================================
   TRIVIA NIGHT · game screens (one screen, and the live host panel)
   --------------------------------------------------------------------------
   The page's <body data-mode="..."> picks how it runs:

   solo  Everything in one browser window: teams buzz with on-screen buttons
         or the number keys 1-4. "Simulated" teams buzz by themselves.
         The game is saved in this browser, so a refresh doesn't lose it.

   host  The host panel for a live game. The host creates a room, players
         join on their own phones (play/), and their buzzes and picks arrive
         through the live room (live.js). This browser runs the rules and
         publishes what everyone sees. A refresh rejoins the room.

   The rules all live in game.js; this file only draws them and handles taps.
   ========================================================================== */

(function () {
  'use strict';

  var G = window.TriviaGame;
  var Boards = window.TriviaBoards;
  var Live = window.TriviaLive;
  var LIVE = document.body.getAttribute('data-mode') === 'host';
  var PICK = 'trivia-night:pick';
  var STORE = LIVE ? 'trivia-night:host' : 'trivia-night:v1';
  var KEYS = ['1', '2', '3', '4'];

  var app = document.getElementById('app');
  var topActions = document.querySelector('[data-slot="top-actions"]');
  var boardName = document.querySelector('[data-slot="board-name"]');

  // ---- Screen state (not part of the game rules) ----
  var state = null;           // the game, from game.js
  var setup = { boardId: null, teams: [{ name: '', bot: false }, { name: '', bot: false }] };
  var ui = freshUi();
  var botPlan = {};           // teamId -> time it will buzz, for the open question

  // ---- Live room (host mode only) ----
  var ctx = null;             // connection, from live.js
  var room = null;            // { code, board } once a room exists
  var lobby = { teams: {}, players: {} };
  var net = { status: LIVE ? 'connecting' : 'off', error: '', online: true, buzzKey: null, buzzRef: null };

  function freshUi() { return { error: '', peek: false, fixing: false, flash: null, copied: false }; }
  function now() { return ctx ? ctx.serverNow() : Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US'); }
  function team(id) { return state && G.findTeam(state, id); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ---- Saving (wrapped: storage can be blocked, and the game still works) ----
  function save() {
    try {
      var data = LIVE ? { code: room ? room.code : null, setup: setup } : { state: state, setup: setup };
      localStorage.setItem(STORE, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null') || {}; } catch (e) { return {}; }
  }

  function set(next) {
    if (next === state) return;
    var opened = next && next.phase === 'question' && (!state || state.phase !== 'question');
    state = next;
    ui.justOpened = opened;
    if (opened && !LIVE) planBots();
    save();
    publish();
    render();
  }

  /* ---- Live room: publishing and listening (host mode) ----------------- */

  function publish() {
    if (!LIVE || !ctx || !room) return;
    ctx.room(room.code).update({
      public: Live.project(G, state, room.board),
      private: { board: room.board, state: state }
    }).catch(function () { net.online = false; render(); });
    listenForBuzzes();
  }

  // Each question has its own buzz list; listen to the open one.
  function listenForBuzzes() {
    var key = state && state.phase === 'question' ? state.q.c + '-' + state.q.r : null;
    if (key === net.buzzKey) return;
    if (net.buzzRef) net.buzzRef.off();
    net.buzzKey = key;
    net.buzzRef = null;
    if (!key) return;
    net.buzzRef = ctx.room(room.code, 'buzzes/' + key);
    net.buzzRef.on('child_added', function (snap) {
      var b = snap.val() || {};
      if (!state || state.phase !== 'question' || state.q.c + '-' + state.q.r !== key) return;
      if (typeof b.at !== 'number') return;
      var before = state;
      set(G.buzz(state, snap.key, b.at));
      if (state !== before) flash(snap.key);
    });
  }

  function watchRoom() {
    var code = room.code;
    ctx.room(code, 'teams').on('value', function (s) { lobby.teams = s.val() || {}; render(); });
    ctx.room(code, 'players').on('value', function (s) { lobby.players = s.val() || {}; render(); });
    ctx.room(code, 'host').on('value', function (s) {
      if (room && room.code === code && !s.exists()) { leaveRoom(); render(); }  // room closed elsewhere
    });
  }

  function unwatchRoom(code) {
    ['teams', 'players', 'host'].forEach(function (p) { ctx.room(code, p).off(); });
    if (net.buzzRef) net.buzzRef.off();
    net.buzzRef = null; net.buzzKey = null;
  }

  function leaveRoom() {
    if (room) unwatchRoom(room.code);
    room = null; state = null; lobby = { teams: {}, players: {} };
    ui = freshUi();
    save();
  }

  function playersOn(teamId) {
    return Object.keys(lobby.players).filter(function (id) { return lobby.players[id].team === teamId; }).length;
  }
  function lobbyTeams() {
    return Object.keys(lobby.teams).map(function (slot) {
      return { id: slot, name: lobby.teams[slot].name, slug: lobby.teams[slot].slug, at: lobby.teams[slot].at || 0 };
    }).sort(function (a, b) { return a.at - b.at; });
  }

  async function startLive() {
    net.status = 'connecting';
    render();
    try {
      ctx = await Live.connect();
      ctx.onConnection(function (on) { if (net.online !== on) { net.online = on; render(); } });
      net.status = 'ready';
      var saved = load();
      if (saved.code) await rejoin(saved.code);
    } catch (e) {
      net.status = 'error';
      net.error = e.message;
    }
    render();
  }

  // After a refresh: pick up the room this browser was hosting.
  async function rejoin(code) {
    try {
      var host = (await ctx.room(code, 'host').get()).val();
      if (host !== ctx.uid) { save(); return; }
      var priv = (await ctx.room(code, 'private').get()).val() || {};
      if (!priv.board) return;
      room = { code: code, board: priv.board };
      state = priv.state && priv.state.v === 1 ? normalizeState(priv.state) : null;
      watchRoom();
      publish();
    } catch (e) { room = null; state = null; }
  }

  // The database drops empty lists and objects; put them back.
  function normalizeState(s) {
    s.played = s.played || {};
    if (s.q) { s.q.buzzes = s.q.buzzes || []; s.q.wrong = s.q.wrong || {}; s.q.winner = s.q.winner || null; s.q.ended = s.q.ended || null; }
    if (s.q) s.q.stoppedAt = s.q.stoppedAt == null ? null : s.q.stoppedAt;
    s.teams.forEach(function (t) { t.bot = !!t.bot; });
    return s;
  }

  /* ---- Simulated teams (one-screen mode): each buzzes on ~3 in 4 questions */
  function planBots() {
    botPlan = {};
    state.teams.forEach(function (t) {
      if (t.bot && Math.random() < 0.75) botPlan[t.id] = state.q.openedAt + 600 + Math.random() * 5400;
    });
  }

  /* ---- Moves ----------------------------------------------------------- */

  function flash(id) {
    ui.flash = id;
    render();
    setTimeout(function () { if (ui.flash === id) { ui.flash = null; render(); } }, 450);
  }
  function doBuzz(id) {
    if (LIVE || !state || !G.canBuzz(state, id, now())) return;
    set(G.buzz(state, id, now()));
    flash(id);
  }

  // "Tap again to confirm": the first tap arms the button for 4 seconds.
  var sureTimer = null;
  function sure(name) {
    if (ui.confirming === name) { ui.confirming = null; clearTimeout(sureTimer); return true; }
    ui.confirming = name;
    clearTimeout(sureTimer);
    sureTimer = setTimeout(function () { ui.confirming = null; render(); }, 4000);
    render();
    return false;
  }
  function sureBtn(name, label, armed, extra) {
    var on = ui.confirming === name;
    return '<button class="btn btn--sm' + (on ? ' is-armed' : '') + (extra ? ' ' + extra : '') + '" type="button" data-act="' + name + '">' + (on ? armed : label) + '</button>';
  }

  function chosenBoard() {
    var board = Boards.get(setup.boardId);
    if (!board || !Boards.check(board).ready) throw new Error('Pick a board that has all 30 questions filled in.');
    return Boards.toGame(board);
  }

  var actions = {
    'add-team': function () {
      if (setup.teams.length < G.MAX_TEAMS) setup.teams.push({ name: '', bot: false });
      render();
      var inputs = app.querySelectorAll('[data-team-name]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    },
    'remove-team': function (el) {
      setup.teams.splice(+el.getAttribute('data-i'), 1);
      render();
    },
    'start': function () {
      try {
        ui.error = '';
        set(G.createGame(chosenBoard(), setup.teams));
      } catch (e) {
        ui.error = e.message;
        render();
      }
    },

    // Live: make a room, wait in the lobby, then start.
    'create-room': async function (el) {
      try {
        ui.error = '';
        var board = chosenBoard();
        el.disabled = true;
        el.textContent = 'Creating room…';
        var code = await Live.createRoom(ctx);
        room = { code: code, board: board };
        state = null;
        watchRoom();
        save();
        publish();
      } catch (e) {
        ui.error = e.message;
      }
      render();
    },
    'start-live': function () {
      var teams = lobbyTeams();
      if (!teams.length) return;
      ctx.room(room.code, 'buzzes').remove();
      ui = freshUi();
      set(G.createGame(room.board, teams.map(function (t) { return { id: t.id, name: t.name }; })));
    },
    'kick-team': function (el) {
      var slot = el.getAttribute('data-team');
      var t = lobby.teams[slot];
      if (!t) return;
      var changes = {};
      changes['teams/' + slot] = null;
      changes['names/' + t.slug] = null;
      Object.keys(lobby.players).forEach(function (id) { if (lobby.players[id].team === slot) changes['players/' + id] = null; });
      ctx.room(room.code).update(changes);
    },
    'copy-link': function () {
      var url = Live.inviteUrl(room.code);
      var done = function () { ui.copied = true; render(); setTimeout(function () { ui.copied = false; render(); }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { selectLink(); });
      else selectLink();
    },
    'close-room': function () {
      if (!sure('close-room')) return;
      var code = room.code;
      leaveRoom();
      ctx.room(code).remove();
      render();
    },

    'pick': function (el) {
      ui.peek = false;
      set(G.pick(state, +el.getAttribute('data-c'), +el.getAttribute('data-r'), now()));
    },
    'buzz': function (el) { doBuzz(el.getAttribute('data-team')); },
    'correct': function () { set(G.judge(state, true)); },
    'wrong': function () { set(G.judge(state, false)); },
    'reveal': function () { set(G.reveal(state)); },
    'skip': function () { if (sure('skip')) set(G.skip(state)); },
    'next': function () { set(G.next(state)); },
    'peek': function () { ui.peek = !ui.peek; render(); },
    'fix': function () { ui.fixing = !ui.fixing; render(); },
    'end': function () { if (sure('end')) set(G.endGame(state)); },
    'new-game': function () {
      state = null;
      ui = freshUi();
      save();
      render();
    },
    'rematch': function () {
      if (LIVE) ctx.room(room.code, 'buzzes').remove();
      var teams = state.teams.map(function (t) { return { id: LIVE ? t.id : undefined, name: t.name, bot: t.bot }; });
      ui = freshUi();
      set(G.createGame(state.board, teams));
    }
  };

  function selectLink() {
    var el = app.querySelector('.tn-invite-url');
    if (!el) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  app.addEventListener('click', handle);
  topActions.addEventListener('click', handle);
  function handle(e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) fn(el);
  }

  app.addEventListener('input', function (e) {
    var i = e.target.getAttribute('data-team-name');
    if (i !== null) { setup.teams[+i].name = e.target.value; save(); }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-team-bot')) { setup.teams[+t.getAttribute('data-team-bot')].bot = t.checked; save(); }
    if (t.name === 'board') { setup.boardId = t.value; save(); }
    if (t.hasAttribute('data-score')) {
      // Typed score: keep it if it's a whole number, otherwise put the old one back.
      var id = t.getAttribute('data-score');
      var raw = t.value.replace(/[\s,]/g, '').replace('−', '-');
      if (/^-?\d+$/.test(raw)) { state = G.setScore(state, id, +raw); save(); publish(); t.value = team(id).score; }
      else t.value = team(id).score;
    }
  });
  app.addEventListener('submit', function (e) { e.preventDefault(); if (!LIVE) actions.start(); });

  // One-screen mode: number keys 1-4 buzz for team 1-4 (ignored while typing).
  document.addEventListener('keydown', function (e) {
    if (LIVE || !state || state.phase !== 'question' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var i = KEYS.indexOf(e.key);
    if (i >= 0 && state.teams[i]) { e.preventDefault(); doBuzz(state.teams[i].id); }
  });

  // ---- Clock: timer display, simulated buzzes, time running out ----
  setInterval(function () {
    if (!state || state.phase !== 'question') return;
    var t = now();
    Object.keys(botPlan).forEach(function (id) {
      if (t >= botPlan[id]) { delete botPlan[id]; doBuzz(id); }
    });
    // Time just ran out with nobody buzzed: redraw so the buzzers close.
    var expired = !G.timerStopped(state) && G.timeLeft(state, t) <= 0;
    if (expired && !ui.expired) { ui.expired = true; render(); return; }
    if (!expired) ui.expired = false;
    drawTimer();
  }, 100);

  function drawTimer() {
    var el = app.querySelector('[data-slot="timer"]');
    if (!el || !state || !state.q) return;
    var left = G.timeLeft(state, now());
    var secs = Math.ceil(left / 1000);
    el.querySelector('.tn-timer-num').textContent = left > 0 ? '0:' + (secs < 10 ? '0' : '') + secs : 'Time';
    el.querySelector('.tn-timer-fill').style.width = (left / G.QUESTION_MS * 100) + '%';
    var stopped = G.timerStopped(state);
    el.classList.toggle('is-stopped', stopped);
    el.classList.toggle('is-low', !stopped && left > 0 && left <= 5000);
    el.classList.toggle('is-done', !stopped && left <= 0);
  }

  /* ---- Drawing --------------------------------------------------------- */

  function render() {
    // Keep keyboard focus on the same control across redraws.
    var focusId = document.activeElement && document.activeElement.id;
    boardName.textContent = state ? state.board.title : room ? room.board.title : '';
    var html, top = '';
    if (LIVE && net.status !== 'ready') html = renderConnecting();
    else if (LIVE && !room) html = renderSetup();
    else if (LIVE && !state) { html = renderLobby(); top = sureBtn('close-room', 'Close room', 'Tap again to close'); }
    else if (!state) html = renderSetup();
    else if (state.phase === 'final') html = renderFinal();
    else { html = renderGame(); top = sureBtn('end', 'End game', 'Tap again to end'); }
    topActions.innerHTML = (LIVE && room ? '<span class="tn-room-chip">Room Code <b>' + room.code + '</b></span>' : '') + top;
    app.innerHTML = (LIVE && room && !net.online ? '<p class="tn-offline" role="status">Reconnecting… Changes will sync when you\'re back online.</p>' : '') + html;
    drawTimer();
    if (focusId) { var f = document.getElementById(focusId); if (f && f !== document.activeElement) f.focus(); }
  }

  function renderConnecting() {
    var body = net.status === 'error'
      ? '<h1 class="display tn-setup-title">Live games aren\'t ready</h1>' +
        '<p class="tn-setup-lede">' + esc(net.error) + '</p>' +
        '<p class="tn-setup-lede">You can still <a href="../solo/">play on one screen</a>.</p>'
      : '<h1 class="display tn-setup-title">Connecting…</h1><p class="tn-setup-lede">Getting the live room ready.</p>';
    return '<section class="tn-setup paper tape">' + body + '</section>';
  }

  function boardOptions() {
    var all = Boards.all();
    var ready = all.filter(function (b) { return Boards.check(b).ready; });
    if (!ready.some(function (b) { return b.id === setup.boardId; })) setup.boardId = ready[0] ? ready[0].id : null;
    return all.map(function (b) {
      var c = Boards.check(b);
      var label = (b.title || 'Untitled board') + (c.ready ? '' : ' (draft: ' + c.filled + ' of ' + c.total + ')');
      return '<option value="' + esc(b.id) + '"' + (b.id === setup.boardId ? ' selected' : '') + (c.ready ? '' : ' disabled') + '>' + esc(label) + '</option>';
    }).join('');
  }
  function boardPicker() {
    return '<div class="tn-label-row"><label class="tn-label" for="board">Board</label><a class="tn-link-btn" href="../build/">Build or edit boards</a></div>' +
      '<select id="board" name="board" class="tn-input">' + boardOptions() + '</select>';
  }

  function renderSetup() {
    if (LIVE) {
      return '<section class="tn-setup paper tape">' +
        '<h1 class="display tn-setup-title">Host a live game</h1>' +
        '<p class="tn-setup-lede">Create a room, share the link on your video call, and everyone plays and buzzes from their own phone.</p>' +
        '<form novalidate>' + boardPicker() +
          (ui.error ? '<p class="tn-error" role="alert">' + esc(ui.error) + '</p>' : '') +
          '<button class="btn btn--solid tn-start" type="button" data-act="create-room">Create a room</button>' +
        '</form></section>';
    }
    var rows = setup.teams.map(function (t, i) {
      return '<div class="tn-team-row">' +
        '<span class="tn-key" aria-hidden="true">' + KEYS[i] + '</span>' +
        '<label class="sr-only" for="team-' + i + '">Team ' + (i + 1) + ' name</label>' +
        '<input id="team-' + i + '" class="tn-input" data-team-name="' + i + '" maxlength="24" autocomplete="off" placeholder="Team ' + (i + 1) + ' name" value="' + esc(t.name) + '">' +
        '<label class="tn-check"><input type="checkbox" data-team-bot="' + i + '"' + (t.bot ? ' checked' : '') + '> Simulated</label>' +
        (setup.teams.length > 1 ? '<button class="tn-icon-btn" type="button" data-act="remove-team" data-i="' + i + '" aria-label="Remove team ' + (i + 1) + '">×</button>' : '') +
      '</div>';
    }).join('');
    return '<section class="tn-setup paper tape">' +
      '<h1 class="display tn-setup-title">Set up the game</h1>' +
      '<p class="tn-setup-lede">Everyone plays on this screen. Teams buzz with their button, or by pressing their number key.</p>' +
      '<form novalidate>' + boardPicker() +
        '<fieldset class="tn-fieldset"><legend class="tn-label">Teams (up to ' + G.MAX_TEAMS + ')</legend>' + rows +
        (setup.teams.length < G.MAX_TEAMS ? '<button class="tn-link-btn" type="button" data-act="add-team">+ Add a team</button>' : '') +
        '<p class="tn-hint">Simulated teams buzz by themselves, so you can test the game alone.</p></fieldset>' +
        (ui.error ? '<p class="tn-error" role="alert">' + esc(ui.error) + '</p>' : '') +
        '<button class="btn btn--solid tn-start" type="submit">Start the game</button>' +
      '</form>' +
    '</section>';
  }

  function renderLobby() {
    var url = Live.inviteUrl(room.code);
    var teams = lobbyTeams();
    var waitingPlayers = Object.keys(lobby.players).length;
    var list = teams.length ? teams.map(function (t) {
      var n = playersOn(t.id);
      return '<li class="tn-lobby-team"><span class="tn-order-name">' + esc(t.name) + '</span>' +
        '<span class="tn-order-note">' + plural(n, 'player', 'players') + '</span>' +
        '<button class="tn-link-btn" type="button" data-act="kick-team" data-team="' + t.id + '" aria-label="Remove ' + esc(t.name) + '">Remove</button></li>';
    }).join('') : '<li class="tn-order-empty">No teams yet. Players create them when they join.</li>';
    return '<section class="tn-lobby paper tape">' +
      '<p class="kicker">Room code</p>' +
      '<p class="tn-code" aria-label="Room code ' + room.code.split('').join(' ') + '">' + room.code + '</p>' +
      '<div class="tn-invite"><span class="tn-invite-url">' + esc(url) + '</span>' +
        '<button class="btn btn--sm" type="button" data-act="copy-link">' + (ui.copied ? 'Copied' : 'Copy invite link') + '</button></div>' +
      '<p class="tn-hint">Paste the link in your call\'s chat. Players can also open the join page and type the code.</p>' +
      '<h2 class="tn-card-title tn-lobby-title">Teams <span class="tn-count">' + teams.length + ' of ' + G.MAX_TEAMS + '</span></h2>' +
      '<ul class="tn-lobby-list" aria-live="polite">' + list + '</ul>' +
      '<p class="tn-hint">' + plural(waitingPlayers, 'player has', 'players have') + ' joined a team. Team names lock when you start; late arrivals can still join a team.</p>' +
      '<button class="btn btn--solid tn-start" type="button" data-act="start-live"' + (teams.length ? '' : ' disabled') + '>Start the game</button>' +
    '</section>';
  }

  function renderScores() {
    var top = Math.max.apply(null, state.teams.map(function (t) { return t.score; }));
    return '<section class="tn-scores" aria-label="Scores">' + state.teams.map(function (t, i) {
      return '<div class="tn-score">' +
        '<div class="tn-score-name">' + (LIVE ? '' : '<span class="tn-key tn-key--sm" aria-hidden="true">' + KEYS[i] + '</span>') + esc(t.name) +
          (t.bot ? '<span class="tn-tag">sim</span>' : '') + '</div>' +
        (ui.fixing ? '' : '<div class="tn-score-num' + (t.score < 0 ? ' is-neg' : '') + (t.score === top && t.score > 0 ? ' is-lead' : '') + '">' + fmt(t.score) + '</div>') +
        (ui.fixing ? '<label class="sr-only" for="score-' + t.id + '">Score for ' + esc(t.name) + '</label>' +
          '<input id="score-' + t.id + '" class="tn-score-input" type="text" inputmode="numeric" autocomplete="off" data-score="' + t.id + '" value="' + t.score + '">' : '') +
      '</div>';
    }).join('') +
    '<button class="tn-link-btn tn-fix-toggle" type="button" data-act="fix" aria-pressed="' + ui.fixing + '">' + (ui.fixing ? 'Done fixing' : 'Fix scores') + '</button>' +
    '</section>';
  }

  function renderBoard() {
    var cats = state.board.categories;
    var head = cats.map(function (c) { return '<div class="tn-cat" role="columnheader">' + esc(c.name) + '</div>'; }).join('');
    var cells = '';
    for (var r = 0; r < G.VALUES.length; r++) {
      for (var c = 0; c < cats.length; c++) {
        var played = G.isPlayed(state, c, r);
        cells += played
          ? '<div class="tn-tile is-played" role="gridcell"><span class="sr-only">' + esc(cats[c].name) + ' ' + G.VALUES[r] + ', played</span></div>'
          : '<button class="tn-tile" type="button" data-act="pick" data-c="' + c + '" data-r="' + r + '" aria-label="' + esc(cats[c].name) + ' for ' + G.VALUES[r] + '">' + G.VALUES[r] + '</button>';
      }
    }
    return '<div class="tn-board" role="grid" aria-label="Board" style="--cols:' + cats.length + '">' + head + cells + '</div>';
  }

  function renderQuestion() {
    var q = G.question(state);
    var revealed = state.phase === 'reveal';
    var result = '';
    if (revealed) {
      var e = state.q.ended;
      result = e === 'correct' ? esc(team(state.q.winner).name) + ' got it: +' + q.value
        : e === 'skipped' ? 'Question thrown out. No points lost on it.'
        : 'Nobody got it.';
    }
    var pop = ui.justOpened;
    ui.justOpened = false;
    return '<article class="tn-question' + (revealed ? ' is-revealed' : '') + (pop ? ' is-new' : '') + '" aria-live="polite">' +
      '<div class="tn-q-meta"><span>' + esc(q.category) + ' · ' + q.value + '</span>' +
        (revealed ? '' : '<div class="tn-timer" data-slot="timer"><span class="tn-timer-num">0:30</span><span class="tn-timer-bar"><span class="tn-timer-fill"></span></span></div>') +
      '</div>' +
      '<p class="tn-q-text">' + esc(q.q) + '</p>' +
      (revealed
        ? '<div class="tn-answer"><span class="tn-answer-label">Answer</span><span class="tn-answer-text">' + esc(q.a) + '</span></div>' +
          '<p class="tn-result">' + result + '</p>' +
          '<button class="btn tn-next" type="button" data-act="next">' + (Object.keys(state.played).length >= G.tileCount(state) ? 'See final scores' : 'Back to the board') + '</button>'
        : '<div class="tn-answer is-private"><span class="tn-answer-label">Answer (host only)</span>' +
          (ui.peek || LIVE ? '<span class="tn-answer-text">' + esc(q.a) + '</span>' : '<span class="tn-answer-hidden">hidden</span>') +
          (LIVE ? '' : '<button class="tn-link-btn tn-link-btn--light" type="button" data-act="peek" aria-pressed="' + ui.peek + '">' + (ui.peek ? 'Hide' : 'Peek') + '</button>') + '</div>') +
    '</article>';
  }

  function renderBuzzers() {
    var open = state.phase === 'question';
    var t = now();
    var buzzers = state.teams.map(function (tm, i) {
      var already = state.q && state.q.buzzes.some(function (b) { return b.team === tm.id; });
      var can = open && G.canBuzz(state, tm.id, t);
      var label = !open ? 'Waiting' : already ? 'Buzzed' : can ? 'BUZZ' : 'Closed';
      return '<button class="tn-buzzer' + (can ? ' is-live' : '') + (ui.flash === tm.id ? ' is-flash' : '') + '" type="button" data-act="buzz" data-team="' + tm.id + '"' + (can ? '' : ' disabled') + '>' +
        '<span class="tn-key" aria-hidden="true">' + KEYS[i] + '</span>' +
        '<span class="tn-buzzer-name">' + esc(tm.name) + '</span>' +
        '<span class="tn-buzzer-state">' + label + '</span></button>';
    }).join('');
    return '<section class="tn-card"><h2 class="tn-card-title">Buzzers</h2><div class="tn-buzzers">' + buzzers + '</div>' +
      '<p class="tn-hint">Press a team\'s button or its number key.</p></section>';
  }

  // Live: who's connected, and who has buzzed on this question.
  function renderTeamsCard() {
    var rows = state.teams.map(function (tm) {
      var n = playersOn(tm.id);
      var buzzed = state.q && state.phase === 'question' && state.q.buzzes.some(function (b) { return b.team === tm.id; });
      return '<li class="tn-live-team' + (ui.flash === tm.id ? ' is-flash' : '') + (n ? '' : ' is-empty') + '">' +
        '<span class="tn-dot' + (n ? ' is-on' : '') + '" aria-hidden="true"></span>' +
        '<span class="tn-order-main"><span class="tn-order-name">' + esc(tm.name) + '</span>' +
        '<span class="tn-order-note">' + (n ? plural(n, 'player', 'players') + ' connected' : 'Nobody connected') + '</span></span>' +
        (buzzed ? '<span class="tn-tag tn-tag--on">buzzed</span>' : '') + '</li>';
    }).join('');
    return '<section class="tn-card"><h2 class="tn-card-title">Teams</h2><ul class="tn-live-teams">' + rows + '</ul></section>';
  }

  function renderPanel() {
    var open = state.phase === 'question';
    var t = now();
    var order = G.buzzOrder(state);
    var list = order.length ? order.map(function (o) {
      var tm = team(o.team);
      var note = o.status === 'answering' ? 'Answering now' : o.status === 'wrong' ? 'Wrong · −' + state.q.value
        : o.status === 'correct' ? 'Correct · +' + state.q.value : 'Next in line';
      if (o.status === 'waiting') {
        var ahead = order.filter(function (x) { return x.place < o.place && (x.status === 'waiting' || x.status === 'answering'); }).length;
        note = ahead === 1 ? 'Next up if wrong' : 'In line';
      }
      var judgeBtns = o.status === 'answering'
        ? '<div class="tn-judge"><button class="btn btn--sm tn-correct" type="button" data-act="correct">Correct +' + state.q.value + '</button>' +
          '<button class="btn btn--sm tn-wrong" type="button" data-act="wrong">Wrong −' + state.q.value + '</button></div>'
        : '';
      return '<li class="tn-order-row is-' + o.status + '">' +
        '<span class="tn-place">' + o.place + '</span>' +
        '<span class="tn-order-main"><span class="tn-order-name">' + esc(tm.name) + '</span><span class="tn-order-note">' + note + '</span></span>' +
        '<span class="tn-gap">' + (o.place === 1 ? 'first' : '+' + (o.gap / 1000).toFixed(2) + 's') + '</span>' +
        judgeBtns + '</li>';
    }).join('') : '<li class="tn-order-empty">' + (open ? 'Nobody has buzzed yet.' : 'Pick a question to open the buzzers.') + '</li>';

    // What the host should know (nothing closes on its own; the host reveals).
    var st = G.status(state, t);
    var prompt = st === 'answered' ? '<b>' + esc(team(state.q.winner).name) + ' got it!</b> Reveal the answer when you\'re ready.'
      : st === 'everyone-tried' ? 'Every team has tried. Reveal the answer when you\'re ready.'
      : st === 'time-up' ? 'Time\'s up and nobody buzzed. Reveal the answer when you\'re ready.'
      : st === 'open' && order.length ? 'Waiting for more teams to buzz.' : '';
    var ready = st === 'answered' || st === 'everyone-tried' || st === 'time-up';
    var controls = open
      ? (prompt ? '<p class="tn-prompt' + (ready ? ' is-ready' : '') + '">' + prompt + '</p>' : '') +
        '<div class="tn-controls"><button class="btn btn--sm' + (ready ? ' btn--solid' : '') + '" type="button" data-act="reveal">Reveal answer</button>' +
        (state.q.winner ? '' : sureBtn('skip', 'Skip question', 'Tap again: throw it out')) + '</div>' +
        (ui.confirming === 'skip' ? '<p class="tn-hint">Points lost on this question will be given back.</p>' : '')
      : '';
    return '<aside class="tn-panel">' +
      (LIVE ? renderTeamsCard() : renderBuzzers()) +
      '<section class="tn-card"><h2 class="tn-card-title">Buzz order</h2>' +
        '<ol class="tn-order" aria-live="polite">' + list + '</ol>' +
        controls + '</section>' +
    '</aside>';
  }

  function renderGame() {
    var stage = state.phase === 'board' ? renderBoard() : renderQuestion();
    return renderScores() + '<div class="tn-layout"><section class="tn-stage">' + stage + '</section>' + renderPanel() + '</div>';
  }

  function renderFinal() {
    var ranked = G.standings(state);
    var best = ranked[0].score;
    var winners = ranked.filter(function (t) { return t.score === best; });
    var headline = winners.length > 1 ? 'It\'s a tie!' : esc(winners[0].name) + ' wins!';
    var place = 0, last = null;
    var rows = ranked.map(function (t, i) {
      if (t.score !== last) { place = i + 1; last = t.score; }
      return '<li class="tn-final-row' + (t.score === best ? ' is-top' : '') + '"><span class="tn-place">' + place + '</span>' +
        '<span class="tn-order-name">' + esc(t.name) + '</span><span class="tn-final-num' + (t.score < 0 ? ' is-neg' : '') + '">' + fmt(t.score) + '</span></li>';
    }).join('');
    return '<section class="tn-final paper tape">' +
      '<p class="kicker">Final scores</p>' +
      '<h1 class="display tn-final-title">' + headline + '</h1>' +
      '<ol class="tn-final-list">' + rows + '</ol>' +
      '<div class="tn-final-actions"><button class="btn btn--solid" type="button" data-act="rematch">Play again, same teams</button>' +
      (LIVE ? sureBtn('close-room', 'Close the room', 'Tap again to close', 'tn-btn-lg')
            : '<button class="btn" type="button" data-act="new-game">New game</button>') + '</div>' +
    '</section>';
  }

  /* ---- Start ------------------------------------------------------------ */

  var saved = load();
  if (saved.setup) setup = saved.setup;
  if (!LIVE && saved.state && saved.state.v === 1) state = saved.state;
  // Arriving from the builder's "Play this board" button.
  try {
    var picked = localStorage.getItem(PICK);
    if (picked) { localStorage.removeItem(PICK); setup.boardId = picked; if (!LIVE && state && state.phase === 'final') state = null; save(); }
  } catch (e) { /* ignore */ }
  if (!LIVE && state && state.phase === 'question') planBots();
  render();
  if (LIVE) startLive();
})();
