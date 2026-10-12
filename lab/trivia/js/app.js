/* ==========================================================================
   TRIVIA NIGHT · single-device game (screens)
   --------------------------------------------------------------------------
   Everything runs in one browser window: the host's laptop shows the board,
   and teams buzz with on-screen buttons or the number keys 1-4.
   "Simulated" teams buzz by themselves, for testing without friends.
   The rules all live in game.js; this file only draws them and handles taps.
   The game is saved in this browser, so a refresh doesn't lose it.
   ========================================================================== */

(function () {
  'use strict';

  var G = window.TriviaGame;
  var Boards = window.TriviaBoards;
  var PICK = 'trivia-night:pick';
  var STORE = 'trivia-night:v1';
  var KEYS = ['1', '2', '3', '4'];

  var app = document.getElementById('app');
  var topActions = document.querySelector('[data-slot="top-actions"]');
  var boardName = document.querySelector('[data-slot="board-name"]');

  // ---- Local screen state (not part of the game rules) ----
  var state = null;           // the game, from game.js
  var setup = { boardId: null, teams: [{ name: '', bot: false }, { name: '', bot: false }] };
  var ui = { error: '', peek: false, fixing: false, flash: null };
  var botPlan = {};           // teamId -> time it will buzz, for the open question

  function now() { return Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US'); }
  function team(id) { return state && G.findTeam(state, id); }
  function teamIndex(id) { return state.teams.indexOf(team(id)); }

  // ---- Saving (wrapped: storage can be blocked, and the game still works) ----
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ state: state, setup: setup })); } catch (e) { /* ignore */ }
  }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved && saved.setup) setup = saved.setup;
      if (saved && saved.state && saved.state.v === 1) state = saved.state;
    } catch (e) { /* ignore */ }
  }

  function set(next) {
    if (next === state) return;
    var opened = next && next.phase === 'question' && (!state || state.phase !== 'question');
    state = next;
    ui.justOpened = opened;
    if (opened) planBots();
    save();
    render();
  }

  // ---- Simulated teams: each buzzes on about 3 in 4 questions ----
  function planBots() {
    botPlan = {};
    state.teams.forEach(function (t) {
      if (t.bot && Math.random() < 0.75) botPlan[t.id] = state.q.openedAt + 600 + Math.random() * 5400;
    });
  }

  // ---- Moves ----
  function doBuzz(id) {
    if (!state || !G.canBuzz(state, id, now())) return;
    ui.flash = id;
    set(G.buzz(state, id, now()));
    setTimeout(function () { ui.flash = null; render(); }, 450);
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
  function sureBtn(name, label, armed) {
    var on = ui.confirming === name;
    return '<button class="btn btn--sm' + (on ? ' is-armed' : '') + '" type="button" data-act="' + name + '">' + (on ? armed : label) + '</button>';
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
      var board = Boards.get(setup.boardId);
      try {
        ui.error = '';
        if (!board || !Boards.check(board).ready) throw new Error('Pick a board that has all 30 questions filled in.');
        set(G.createGame(Boards.toGame(board), setup.teams));
      } catch (e) {
        ui.error = e.message;
        render();
      }
    },
    'pick': function (el) {
      ui.peek = false;
      set(G.pick(state, +el.getAttribute('data-c'), +el.getAttribute('data-r'), now()));
    },
    'buzz': function (el) { doBuzz(el.getAttribute('data-team')); },
    'correct': function () { set(G.judge(state, true, now())); },
    'wrong': function () { set(G.judge(state, false, now())); },
    'reveal': function () { set(G.reveal(state)); },
    'skip': function () {
      if (sure('skip')) set(G.skip(state));
    },
    'next': function () { set(G.next(state)); },
    'peek': function () { ui.peek = !ui.peek; render(); },
    'fix': function () { ui.fixing = !ui.fixing; render(); },
    'end': function () {
      if (sure('end')) set(G.endGame(state));
    },
    'new-game': function () {
      state = null;
      ui = { error: '', peek: false, fixing: false, flash: null };
      save();
      render();
    },
    'rematch': function () {
      var teams = state.teams.map(function (t) { return { name: t.name, bot: t.bot }; });
      set(G.createGame(state.board, teams));
    }
  };

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
      if (/^-?\d+$/.test(raw)) { state = G.setScore(state, id, +raw); save(); t.value = team(id).score; }
      else t.value = team(id).score;
    }
    if (t.name === 'picker') set(G.setPicker(state, t.value === 'host' ? null : t.value));
  });
  app.addEventListener('submit', function (e) { e.preventDefault(); actions.start(); });

  // Number keys 1-4 buzz for team 1-4 (ignored while typing).
  document.addEventListener('keydown', function (e) {
    if (!state || state.phase !== 'question' || e.metaKey || e.ctrlKey || e.altKey) return;
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
    var after = G.tick(state, t);
    if (after !== state) { set(after); return; }
    // Time just ran out but a team is still answering: redraw so buzzers close.
    var expired = G.timeLeft(state, t) <= 0;
    if (expired && !ui.expired) { ui.expired = true; render(); return; }
    if (!expired) ui.expired = false;
    drawTimer();
  }, 100);

  function drawTimer() {
    var el = app.querySelector('[data-slot="timer"]');
    if (!el || !state.q) return;
    var left = G.timeLeft(state, now());
    var secs = Math.ceil(left / 1000);
    el.querySelector('.tn-timer-num').textContent = left > 0 ? '0:' + (secs < 10 ? '0' : '') + secs : 'Time';
    el.querySelector('.tn-timer-fill').style.width = (left / G.QUESTION_MS * 100) + '%';
    el.classList.toggle('is-low', left > 0 && left <= 5000);
    el.classList.toggle('is-done', left <= 0);
  }

  // ---- Drawing ----
  function render() {
    boardName.textContent = state ? state.board.title : '';
    if (!state) { topActions.innerHTML = ''; app.innerHTML = renderSetup(); return; }
    topActions.innerHTML = state.phase === 'final' ? '' :
      sureBtn('end', 'End game', 'Tap again to end');
    app.innerHTML = state.phase === 'final' ? renderFinal() : renderGame();
    drawTimer();
  }

  function renderSetup() {
    var rows = setup.teams.map(function (t, i) {
      return '<div class="tn-team-row">' +
        '<span class="tn-key" aria-hidden="true">' + KEYS[i] + '</span>' +
        '<label class="sr-only" for="team-' + i + '">Team ' + (i + 1) + ' name</label>' +
        '<input id="team-' + i + '" class="tn-input" data-team-name="' + i + '" maxlength="24" autocomplete="off" placeholder="Team ' + (i + 1) + ' name" value="' + esc(t.name) + '">' +
        '<label class="tn-check"><input type="checkbox" data-team-bot="' + i + '"' + (t.bot ? ' checked' : '') + '> Simulated</label>' +
        (setup.teams.length > 1 ? '<button class="tn-icon-btn" type="button" data-act="remove-team" data-i="' + i + '" aria-label="Remove team ' + (i + 1) + '">×</button>' : '') +
      '</div>';
    }).join('');
    var all = Boards.all();
    var ready = all.filter(function (b) { return Boards.check(b).ready; });
    if (!ready.some(function (b) { return b.id === setup.boardId; })) setup.boardId = ready[0] ? ready[0].id : null;
    var boards = all.map(function (b) {
      var c = Boards.check(b);
      var label = (b.title || 'Untitled board') + (c.ready ? '' : ' (draft: ' + c.filled + ' of ' + c.total + ')');
      return '<option value="' + esc(b.id) + '"' + (b.id === setup.boardId ? ' selected' : '') + (c.ready ? '' : ' disabled') + '>' + esc(label) + '</option>';
    }).join('');
    return '<section class="tn-setup paper tape">' +
      '<h1 class="display tn-setup-title">Set up the game</h1>' +
      '<p class="tn-setup-lede">Everyone plays on this screen. Teams buzz with their button, or by pressing their number key.</p>' +
      '<form novalidate>' +
        '<div class="tn-label-row"><label class="tn-label" for="board">Board</label><a class="tn-link-btn" href="build/">Build or edit boards</a></div>' +
        '<select id="board" name="board" class="tn-input">' + boards + '</select>' +
        '<fieldset class="tn-fieldset"><legend class="tn-label">Teams (up to ' + G.MAX_TEAMS + ')</legend>' + rows +
        (setup.teams.length < G.MAX_TEAMS ? '<button class="tn-link-btn" type="button" data-act="add-team">+ Add a team</button>' : '') +
        '<p class="tn-hint">Simulated teams buzz by themselves, so you can test the game alone.</p></fieldset>' +
        (ui.error ? '<p class="tn-error" role="alert">' + esc(ui.error) + '</p>' : '') +
        '<button class="btn btn--solid tn-start" type="submit">Start the game</button>' +
      '</form>' +
    '</section>';
  }

  function renderScores() {
    var top = Math.max.apply(null, state.teams.map(function (t) { return t.score; }));
    return '<section class="tn-scores" aria-label="Scores">' + state.teams.map(function (t, i) {
      var picking = state.phase === 'board' && state.picker === t.id;
      return '<div class="tn-score' + (picking ? ' is-picking' : '') + '">' +
        '<div class="tn-score-name"><span class="tn-key tn-key--sm" aria-hidden="true">' + KEYS[i] + '</span>' + esc(t.name) +
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
    var picker = state.picker ? team(state.picker).name : null;
    return '<div class="tn-pick-line"><span class="tn-hand">' + (picker ? esc(picker) + ' picks next' : 'Host picks the first question') + '</span>' +
      pickerSelect() + '</div>' +
      '<div class="tn-board" role="grid" aria-label="Board" style="--cols:' + cats.length + '">' + head + cells + '</div>';
  }

  function pickerSelect() {
    var opts = '<option value="host"' + (state.picker === null ? ' selected' : '') + '>Host</option>' +
      state.teams.map(function (t) { return '<option value="' + t.id + '"' + (state.picker === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
    return '<label class="tn-picker"><span>Who picks</span><select name="picker" class="tn-input tn-input--sm">' + opts + '</select></label>';
  }

  function renderQuestion() {
    var q = G.question(state);
    var revealed = state.phase === 'reveal';
    var result = '';
    if (revealed) {
      var e = state.q.ended;
      result = e === 'correct' ? esc(team(state.q.winner).name) + ' got it: +' + q.value
        : e === 'skipped' ? 'Question thrown out. No points changed.'
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
          (ui.peek ? '<span class="tn-answer-text">' + esc(q.a) + '</span>' : '<span class="tn-answer-hidden">hidden</span>') +
          '<button class="tn-link-btn tn-link-btn--light" type="button" data-act="peek" aria-pressed="' + ui.peek + '">' + (ui.peek ? 'Hide' : 'Peek') + '</button></div>') +
    '</article>';
  }

  function renderPanel() {
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

    var order = G.buzzOrder(state);
    var answeringId = G.answering(state);
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

    var waiting = open && !answeringId && G.timeLeft(state, t) > 0;
    var controls = open
      ? '<div class="tn-controls"><button class="btn btn--sm" type="button" data-act="reveal">Reveal answer</button>' +
        sureBtn('skip', 'Skip question', 'Tap again: throw it out') + '</div>' +
        (ui.confirming === 'skip' ? '<p class="tn-hint">Points lost on this question will be given back.</p>' : '')
      : '';
    return '<aside class="tn-panel">' +
      '<section class="tn-card"><h2 class="tn-card-title">Buzzers</h2><div class="tn-buzzers">' + buzzers + '</div>' +
        '<p class="tn-hint">Press a team\'s button or its number key.</p></section>' +
      '<section class="tn-card"><h2 class="tn-card-title">Buzz order</h2>' +
        '<ol class="tn-order" aria-live="polite">' + list + '</ol>' +
        (waiting && order.length ? '<p class="tn-hint">Waiting for more teams to buzz.</p>' : '') +
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
      '<button class="btn" type="button" data-act="new-game">New game</button></div>' +
    '</section>';
  }

  load();
  // Arriving from the builder's "Play this board" button.
  try {
    var picked = localStorage.getItem(PICK);
    if (picked) { localStorage.removeItem(PICK); setup.boardId = picked; if (state && state.phase === 'final') state = null; save(); }
  } catch (e) { /* ignore */ }
  if (state && state.phase === 'question') planBots();
  render();
})();
