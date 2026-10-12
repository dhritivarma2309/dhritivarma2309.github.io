/* ==========================================================================
   TRIVIA NIGHT · player screen (on each player's phone)
   --------------------------------------------------------------------------
   Join with a room code (or the host's link), create or join a team, then:
   see the scores and board, pick a tile when it's your team's turn, and
   buzz. Everything the host publishes arrives live; a player only ever
   writes their own team, buzz and pick (see live.js for the layout).
   ========================================================================== */

(function () {
  'use strict';

  var Live = window.TriviaLive;
  var STORE = 'trivia-night:player';
  var VALUES = [100, 200, 300, 400, 500];
  var root = document.getElementById('play');
  var meSlot = document.querySelector('[data-slot="me"]');

  var ctx = null;
  var code = null;
  var pub = null;           // what the host publishes
  var teams = {};           // slot -> { name, slug, by, at }
  var players = {};         // uid -> { team }
  var myTeam = null;        // slot of the team I'm on
  var view = 'join';        // join | connecting | room
  var msg = '';             // a one-line note (errors, "room closed")
  var busy = false;
  var sent = {};            // question key -> true once I've buzzed (before the host confirms)
  var expired = false;
  var online = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US'); }
  function store(v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(STORE) || 'null') || {};
      localStorage.setItem(STORE, JSON.stringify(v));
    } catch (e) { return {}; }
  }
  function remember() { store({ code: code, team: myTeam }); }
  function teamName(slot) {
    if (pub && pub.teams && pub.teams[slot]) return pub.teams[slot].name;
    return teams[slot] ? teams[slot].name : '';
  }
  function playersOn(slot) {
    return Object.keys(players).filter(function (id) { return players[id].team === slot; }).length;
  }

  /* ---- Joining ---------------------------------------------------------- */

  async function join(c) {
    code = Live.cleanCode(c);
    if (code.length !== 4) { msg = 'Room codes are 4 letters.'; render(); return; }
    view = 'connecting'; msg = ''; render();
    try {
      ctx = ctx || await Live.connect();
      var host = (await ctx.room(code, 'host').get()).val();
      if (!host) { view = 'join'; msg = 'There\'s no room with the code ' + code + '. Check it with your host.'; render(); return; }
      var saved = store();
      myTeam = saved.code === code ? saved.team || null : null;
      watch();
      view = 'room';
      remember();
      try { history.replaceState(null, '', '?room=' + code + (location.search.match(/[?&]emulator\b/) ? '&emulator' : '')); } catch (e) { /* ignore */ }
    } catch (e) {
      view = 'join';
      msg = Live.isSetUp() ? 'Couldn\'t connect. Check your internet and try again.' : 'Live games aren\'t set up on this site yet.';
    }
    render();
  }

  function watch() {
    ctx.room(code, 'public').on('value', function (s) {
      var before = pub && pub.q ? pub.q.key : null;
      pub = s.val();
      if (pub && pub.q && pub.q.key !== before) expired = false;
      render();
    });
    ctx.room(code, 'teams').on('value', function (s) { teams = s.val() || {}; render(); });
    ctx.room(code, 'players').on('value', function (s) {
      players = s.val() || {};
      var mine = players[ctx.uid];
      if (mine) { myTeam = mine.team; remember(); }
      else if (myTeam) {
        // Gone from the room. In the lobby that means the host removed my team
        // (or I switched); during a game it's a dropped connection, so rejoin.
        if (pub && pub.phase !== 'lobby' && teamName(myTeam)) claimSeat(myTeam).catch(function () {});
        else { myTeam = null; remember(); }
      }
      render();
    });
    ctx.room(code, 'host').on('value', function (s) {
      if (!s.exists() && view === 'room') { leave('The host closed this room. Thanks for playing!'); }
    });
    ctx.onConnection(function (on) {
      online = on;
      if (on && myTeam) claimSeat(myTeam).catch(function () {});
      render();
    });
  }

  // Sit on a team, and leave the seat automatically if this phone disconnects.
  function claimSeat(slot) {
    var ref = ctx.room(code, 'players/' + ctx.uid);
    var seated = players[ctx.uid] && players[ctx.uid].team === slot;
    return (seated ? Promise.resolve() : ref.set({ team: slot })).then(function () { ref.onDisconnect().remove(); });
  }

  function leave(note) {
    if (ctx && code) ['public', 'teams', 'players', 'host'].forEach(function (p) { ctx.room(code, p).off(); });
    code = null; pub = null; teams = {}; players = {}; myTeam = null;
    view = 'join'; msg = note || '';
    store({});
    try { history.replaceState(null, '', location.pathname + (location.search.match(/[?&]emulator\b/) ? '?emulator' : '')); } catch (e) { /* ignore */ }
    render();
  }

  async function createTeam(name) {
    name = name.trim().replace(/\s+/g, ' ');
    if (!name) { msg = 'Type a team name first.'; render(); return; }
    var slug = Live.slug(name);
    var taken = Object.keys(teams).filter(function (s) { return teams[s].slug === slug; })[0];
    if (taken) { msg = '"' + teams[taken].name + '" already exists. Join it, or pick another name.'; render(); return; }
    var free = ['t1', 't2', 't3', 't4'].filter(function (s) { return !teams[s]; });
    if (!free.length) { msg = 'This room already has 4 teams. Join one of them.'; render(); return; }
    busy = true; msg = ''; render();
    for (var i = 0; i < free.length; i++) {
      var changes = {};
      changes['teams/' + free[i]] = { name: name, slug: slug, by: ctx.uid, at: ctx.TS };
      changes['names/' + slug] = free[i];
      try {
        await ctx.room(code).update(changes);
        await claimSeat(free[i]);
        myTeam = free[i]; remember();
        busy = false; render();
        return;
      } catch (e) {
        var fresh = (await ctx.room(code, 'names/' + slug).get()).val();
        if (fresh) { msg = 'Someone just took that name. Pick another one.'; break; }
        if (pub && pub.phase !== 'lobby') { msg = 'The game has started, so new teams are closed. Join a team below.'; break; }
      }
    }
    busy = false;
    if (!msg) msg = 'Couldn\'t create the team. Try again.';
    render();
  }

  async function joinTeam(slot) {
    busy = true; msg = ''; render();
    try { await claimSeat(slot); myTeam = slot; remember(); }
    catch (e) { msg = 'Couldn\'t join that team. Try again.'; }
    busy = false; render();
  }

  /* ---- Playing ---------------------------------------------------------- */

  function myEntry() {
    if (!pub || !pub.q || !pub.q.order) return null;
    return pub.q.order.filter(function (o) { return o.team === myTeam; })[0] || null;
  }

  function canBuzz() {
    if (!pub || pub.phase !== 'question' || !pub.q || !myTeam || !pub.teams || !pub.teams[myTeam]) return false;
    if (pub.q.winner || sent[pub.q.key] || myEntry()) return false;
    return ctx.serverNow() < pub.q.deadline;
  }

  function buzz() {
    if (!canBuzz()) return;
    var key = pub.q.key;
    sent[key] = true;
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* ignore */ } }
    render();
    // If a teammate got there first, the database refuses this one: that's fine.
    ctx.room(code, 'buzzes/' + key + '/' + myTeam).set({ at: ctx.TS, by: ctx.uid }).catch(function () {});
  }

  function pick(c, r) {
    if (!pub || pub.phase !== 'board' || pub.picker !== myTeam) return;
    ctx.room(code, 'pick').set({ c: c, r: r, team: myTeam, at: ctx.TS }).catch(function () {
      msg = 'That pick didn\'t go through. Try again.'; render();
    });
  }

  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.id === 'join-form') join(f.querySelector('#code').value);
    if (f.id === 'team-form') createTeam(f.querySelector('#team-name').value);
  });
  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var a = el.getAttribute('data-act');
    if (a === 'join-team') joinTeam(el.getAttribute('data-team'));
    if (a === 'buzz') buzz();
    if (a === 'pick') pick(+el.getAttribute('data-c'), +el.getAttribute('data-r'));
    if (a === 'switch') { ctx.room(code, 'players/' + ctx.uid).remove(); myTeam = null; remember(); render(); }
    if (a === 'leave') leave();
  });
  // Space bar buzzes on a laptop.
  document.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
    if (pub && pub.phase === 'question') { e.preventDefault(); buzz(); }
  });

  // Timer, and closing the buzzer when time runs out.
  setInterval(function () {
    if (!pub || pub.phase !== 'question' || !pub.q || !ctx) return;
    var left = Math.max(0, pub.q.deadline - ctx.serverNow());
    if (left === 0 && !expired) { expired = true; render(); return; }
    var el = root.querySelector('[data-slot="timer"]');
    if (!el) return;
    var secs = Math.ceil(left / 1000);
    el.querySelector('.tn-timer-num').textContent = left > 0 ? '0:' + (secs < 10 ? '0' : '') + secs : 'Time';
    el.querySelector('.tn-timer-fill').style.width = (left / 30000 * 100) + '%';
    el.classList.toggle('is-low', left > 0 && left <= 5000);
  }, 200);

  /* ---- Drawing ---------------------------------------------------------- */

  function render() {
    var focusId = document.activeElement && document.activeElement.id;
    meSlot.innerHTML = myTeam && teamName(myTeam) ? 'You\'re on <b>' + esc(teamName(myTeam)) + '</b>' : code ? 'Room <b>' + code + '</b>' : '';
    var html;
    if (view === 'join') html = renderJoin();
    else if (view === 'connecting' || !pub) html = '<section class="tn-p-card"><p class="tn-p-wait">Joining room ' + esc(code) + '…</p></section>';
    else if (!myTeam || !teamName(myTeam)) html = renderTeams();
    else html = renderGame();
    root.innerHTML = (view === 'room' && !online ? '<p class="tn-offline" role="status">Reconnecting…</p>' : '') + html;
    if (focusId) { var f = document.getElementById(focusId); if (f) f.focus(); }
  }

  function note() { return msg ? '<p class="tn-error" role="alert">' + esc(msg) + '</p>' : ''; }

  function renderJoin() {
    var pre = '';
    try { pre = Live.cleanCode(new URLSearchParams(location.search).get('room')); } catch (e) { /* ignore */ }
    return '<section class="tn-p-card paper tape">' +
      '<h1 class="display tn-p-title">Join a game</h1>' +
      '<p class="tn-p-lede">Type the 4-letter code your host shared.</p>' +
      '<form id="join-form" novalidate>' +
        '<label class="tn-label" for="code">Room code</label>' +
        '<input id="code" class="tn-input tn-code-input" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD" value="' + esc(pre) + '">' +
        note() +
        '<button class="btn btn--solid tn-start" type="submit">Join</button>' +
      '</form></section>';
  }

  function renderTeams() {
    var slots = Object.keys(teams).sort(function (a, b) { return (teams[a].at || 0) - (teams[b].at || 0); });
    var lobby = pub.phase === 'lobby';
    var list = slots.length ? slots.map(function (s) {
      var n = playersOn(s);
      return '<li><button class="tn-p-team" type="button" data-act="join-team" data-team="' + s + '"' + (busy ? ' disabled' : '') + '>' +
        '<span class="tn-order-name">' + esc(teams[s].name) + '</span>' +
        '<span class="tn-order-note">' + n + (n === 1 ? ' player' : ' players') + ' · tap to join</span></button></li>';
    }).join('') : '<li class="tn-order-empty">No teams yet. Create the first one.</li>';
    var canCreate = lobby && slots.length < 4;
    return '<section class="tn-p-card">' +
      '<p class="kicker">' + esc(pub.boardTitle || 'Trivia Night') + '</p>' +
      '<h1 class="display tn-p-title">Pick your team</h1>' +
      '<ul class="tn-p-teams">' + list + '</ul>' +
      (canCreate
        ? '<form id="team-form" class="tn-p-new" novalidate><label class="tn-label" for="team-name">Or start a new team</label>' +
          '<div class="tn-p-row"><input id="team-name" class="tn-input" maxlength="24" autocomplete="off" placeholder="Team name">' +
          '<button class="btn btn--solid" type="submit"' + (busy ? ' disabled' : '') + '>Create</button></div></form>'
        : '<p class="tn-hint">' + (lobby ? 'The room has 4 teams, the most allowed. Join one above.' : 'The game has started, so new teams are closed. Join one above.') + '</p>') +
      note() +
      '<button class="tn-link-btn" type="button" data-act="leave">Leave this room</button>' +
    '</section>';
  }

  function renderScores() {
    var order = pub.order || [];
    var t = pub.teams || {};
    var top = Math.max.apply(null, order.map(function (s) { return t[s] ? t[s].score : 0; }));
    return '<section class="tn-p-scores" aria-label="Scores">' + order.map(function (s) {
      var sc = t[s] ? t[s].score : 0;
      return '<div class="tn-p-score' + (s === myTeam ? ' is-me' : '') + (pub.phase === 'board' && pub.picker === s ? ' is-picking' : '') + '">' +
        '<span class="tn-p-score-name">' + esc(t[s] ? t[s].name : '') + '</span>' +
        '<span class="tn-score-num' + (sc < 0 ? ' is-neg' : '') + (sc === top && sc > 0 ? ' is-lead' : '') + '">' + fmt(sc) + '</span></div>';
    }).join('') + '</section>';
  }

  function renderGame() {
    var p = pub.phase;
    if (p === 'lobby') return renderLobby();
    if (p === 'final') return renderFinal();
    return renderScores() + (p === 'board' ? renderBoard() : renderQuestion());
  }

  function renderLobby() {
    var slots = Object.keys(teams).sort(function (a, b) { return (teams[a].at || 0) - (teams[b].at || 0); });
    return '<section class="tn-p-card paper tape">' +
      '<p class="kicker">' + esc(pub.boardTitle || '') + '</p>' +
      '<h1 class="display tn-p-title">You\'re on ' + esc(teamName(myTeam)) + '</h1>' +
      '<p class="tn-p-lede">Waiting for the host to start the game.</p>' +
      '<ul class="tn-p-lobby">' + slots.map(function (s) {
        var n = playersOn(s);
        return '<li class="' + (s === myTeam ? 'is-me' : '') + '"><span>' + esc(teams[s].name) + '</span><span class="tn-order-note">' + n + (n === 1 ? ' player' : ' players') + '</span></li>';
      }).join('') + '</ul>' +
      (pub.categories && pub.categories.length ? '<p class="tn-hint">Tonight\'s categories: ' + pub.categories.map(esc).join(' · ') + '</p>' : '') +
      '<button class="tn-link-btn" type="button" data-act="switch">Switch team</button>' +
    '</section>';
  }

  function renderBoard() {
    var cats = pub.categories || [];
    var played = pub.played || {};
    var mine = pub.picker === myTeam;
    var head = cats.map(function (c) { return '<div class="tn-cat" role="columnheader">' + esc(c) + '</div>'; }).join('');
    var cells = '';
    for (var r = 0; r < VALUES.length; r++) {
      for (var c = 0; c < cats.length; c++) {
        cells += played[c + '-' + r]
          ? '<div class="tn-tile is-played" role="gridcell"><span class="sr-only">played</span></div>'
          : mine
            ? '<button class="tn-tile" type="button" data-act="pick" data-c="' + c + '" data-r="' + r + '" aria-label="' + esc(cats[c]) + ' for ' + VALUES[r] + '">' + VALUES[r] + '</button>'
            : '<div class="tn-tile is-idle" role="gridcell">' + VALUES[r] + '</div>';
      }
    }
    var line = mine ? 'Your team picks! Tap a question.'
      : pub.picker ? esc(teamName(pub.picker)) + ' is picking…' : 'The host is picking…';
    return '<p class="tn-hand tn-p-line' + (mine ? ' is-mine' : '') + '">' + line + '</p>' + note() +
      '<div class="tn-board tn-p-board" role="grid" aria-label="Board" style="--cols:' + cats.length + '">' + head + cells + '</div>' +
      '<div class="tn-p-buzz-wrap"><button class="tn-p-buzz is-idle" type="button" disabled>Get ready</button></div>';
  }

  function buzzButton() {
    var q = pub.q;
    var e = myEntry();
    var label, sub = '', cls = 'is-idle', live = false;
    if (pub.phase === 'reveal') {
      label = q.winner === myTeam ? 'Correct!' : e && e.status === 'wrong' ? 'Not this time' : 'Answer revealed';
      cls = q.winner === myTeam ? 'is-good' : 'is-idle';
    } else if (e) {
      if (e.status === 'answering') { label = 'Answer now!'; sub = 'Say it out loud'; cls = 'is-answering'; }
      else if (e.status === 'wrong') { label = 'Wrong'; sub = '−' + q.value; cls = 'is-wrong'; }
      else if (e.status === 'correct') { label = 'Correct!'; cls = 'is-good'; }
      else {
        var ahead = q.order.filter(function (o) { return o.place < e.place && (o.status === 'answering' || o.status === 'waiting'); }).length;
        label = 'You\'re #' + e.place; sub = ahead === 1 ? 'On deck if they miss' : ahead + ' teams ahead'; cls = 'is-queued';
      }
    } else if (sent[q.key]) { label = 'Buzzed'; sub = 'Getting your place…'; cls = 'is-queued'; }
    else if (canBuzz()) { label = 'BUZZ'; cls = 'is-live'; live = true; }
    else { label = q.winner ? 'Answered' : 'Closed'; }
    return '<button class="tn-p-buzz ' + cls + '" type="button" data-act="buzz"' + (live ? '' : ' disabled') + ' aria-live="polite">' +
      '<span>' + label + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
  }

  function renderQuestion() {
    var q = pub.q;
    if (!q) return '';
    var revealed = pub.phase === 'reveal';
    var order = (q.order || []).map(function (o) {
      var label = o.status === 'answering' ? 'answering' : o.status === 'wrong' ? 'wrong' : o.status === 'correct' ? 'correct' : '';
      return '<li class="tn-p-order-row is-' + o.status + (o.team === myTeam ? ' is-me' : '') + '">' +
        '<span class="tn-place">' + o.place + '</span><span class="tn-order-name">' + esc(teamName(o.team)) + (o.team === myTeam ? ' (you)' : '') + '</span>' +
        '<span class="tn-gap">' + (label || (o.place === 1 ? 'first' : '+' + (o.gap / 1000).toFixed(2) + 's')) + '</span></li>';
    }).join('');
    var result = '';
    if (revealed) {
      result = q.ended === 'correct' ? esc(teamName(q.winner)) + ' got it: +' + q.value
        : q.ended === 'skipped' ? 'Question thrown out. No points changed.' : 'Nobody got it.';
    }
    return '<article class="tn-question tn-p-question' + (revealed ? ' is-revealed' : '') + '">' +
        '<div class="tn-q-meta"><span>' + esc(q.category) + ' · ' + q.value + '</span>' +
          (revealed ? '' : '<div class="tn-timer" data-slot="timer"><span class="tn-timer-num">0:30</span><span class="tn-timer-bar"><span class="tn-timer-fill"></span></span></div>') + '</div>' +
        '<p class="tn-q-text">' + esc(q.text) + '</p>' +
        (revealed ? '<div class="tn-answer"><span class="tn-answer-label">Answer</span><span class="tn-answer-text">' + esc(q.answer) + '</span></div><p class="tn-result">' + result + '</p>' : '') +
      '</article>' +
      '<div class="tn-p-buzz-wrap">' + buzzButton() + '</div>' +
      (order ? '<section class="tn-p-card tn-p-order"><h2 class="tn-card-title">Buzz order</h2><ol class="tn-order">' + order + '</ol></section>' : '');
  }

  function renderFinal() {
    var order = (pub.order || []).slice().sort(function (a, b) { return pub.teams[b].score - pub.teams[a].score; });
    var best = order.length ? pub.teams[order[0]].score : 0;
    var winners = order.filter(function (s) { return pub.teams[s].score === best; });
    var headline = winners.indexOf(myTeam) >= 0 ? (winners.length > 1 ? 'You tied for first!' : 'You won!')
      : winners.length > 1 ? 'It\'s a tie!' : esc(pub.teams[winners[0]].name) + ' wins!';
    var place = 0, last = null;
    return '<section class="tn-p-card paper tape tn-p-final">' +
      '<p class="kicker">Final scores</p><h1 class="display tn-p-title">' + headline + '</h1>' +
      '<ol class="tn-final-list">' + order.map(function (s, i) {
        var sc = pub.teams[s].score;
        if (sc !== last) { place = i + 1; last = sc; }
        return '<li class="tn-final-row' + (s === myTeam ? ' is-top' : '') + '"><span class="tn-place">' + place + '</span>' +
          '<span class="tn-order-name">' + esc(pub.teams[s].name) + (s === myTeam ? ' (you)' : '') + '</span>' +
          '<span class="tn-final-num' + (sc < 0 ? ' is-neg' : '') + '">' + fmt(sc) + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="tn-hint">Stay here if your host starts another round.</p></section>';
  }

  /* ---- Start ------------------------------------------------------------ */
  var start = null;
  try { start = new URLSearchParams(location.search).get('room'); } catch (e) { /* ignore */ }
  start = start || store().code;
  render();
  if (start) join(start);
})();
