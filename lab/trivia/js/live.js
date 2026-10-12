/* ==========================================================================
   TRIVIA NIGHT · live rooms
   --------------------------------------------------------------------------
   How a live game is laid out in the database (rooms/<CODE>/...):

     host        the host's id (claimed once, when the room is created)
     public      what everyone sees: phase, board shape, scores, the open
                 question, buzz order. Answers appear only once revealed.
     private     the host's full game, answers included (host-only)
     teams/t1-4  teams players created: { name, slug, by, at }
     names/slug  claims a team name, so two teams can't share one
     players/id  which team each player is on: { team }
     buzzes/c-r  one buzz per team per question: { at (server time), by }
     pick        (unused since the host always picks; kept in the rules)

   The host's browser runs the rules (game.js) and is the only one that
   writes the game state. Players only ever write their own team and
   buzz, and the database rules check both.
   ========================================================================== */

(function (root) {
  'use strict';

  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // no I or O: easy to read aloud
  var SDK = '10.12.2';

  function newCode(rand) {
    rand = rand || Math.random;
    var s = '';
    for (var i = 0; i < 4; i++) s += LETTERS[Math.floor(rand() * LETTERS.length)];
    return s;
  }
  function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }

  // "Quizzly Bears!" -> "quizzly-bears" (used to keep team names unique)
  function slug(name) {
    return String(name || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'team';
  }

  // The part of the game everyone may see. `G` is the rules engine.
  function project(G, state, board) {
    if (!state) {
      return {
        v: 1, phase: 'lobby',
        boardTitle: board ? board.title : '',
        categories: board ? board.categories.map(function (c) { return c.name; }) : []
      };
    }
    var pub = {
      v: 1,
      phase: state.phase,
      boardTitle: state.board.title,
      categories: state.board.categories.map(function (c) { return c.name; }),
      played: {},
      teams: {},
      order: state.teams.map(function (t) { return t.id; }),
      q: null
    };
    Object.keys(state.played).forEach(function (k) { pub.played[k] = true; });
    state.teams.forEach(function (t) { pub.teams[t.id] = { name: t.name, score: t.score }; });
    if (state.q) {
      var q = G.question(state);
      pub.q = {
        key: state.q.c + '-' + state.q.r,
        c: state.q.c, r: state.q.r,
        value: state.q.value,
        category: q.category,
        text: q.q,
        openedAt: state.q.openedAt,
        // Buzzing is allowed until `deadline` (the database rules check it).
        // Once the first buzz stops the clock, buzzing stays open for others,
        // so the cutoff moves far out and phones show the frozen time instead.
        deadline: G.timerStopped(state) ? state.q.openedAt + 6 * 3600 * 1000 : state.q.deadline,
        stopped: G.timerStopped(state),
        timeLeft: G.timerStopped(state) ? G.timeLeft(state, 0) : null,
        order: G.buzzOrder(state),
        winner: state.q.winner || null,
        ended: state.q.ended || null,
        answer: state.phase === 'reveal' ? q.a : null
      };
    }
    return pub;
  }

  /* ---- Connecting ------------------------------------------------------ */

  function onLocalhost() { return /^(localhost|127\.0\.0\.1)$/.test(root.location.hostname); }

  // Local testing: add ?emulator to the address on localhost to use
  // Firebase's local emulator instead of the real project.
  function useEmulator() {
    if (!onLocalhost()) return false;
    try {
      if (/[?&]emulator\b/.test(root.location.search)) root.sessionStorage.setItem('trivia-emulator', '1');
      return root.sessionStorage.getItem('trivia-emulator') === '1';
    } catch (e) { return /[?&]emulator\b/.test(root.location.search); }
  }

  function config() {
    if (useEmulator()) {
      return {
        apiKey: 'demo-key', projectId: 'demo-trivia-night', appId: 'demo',
        databaseURL: 'http://127.0.0.1:9000/?ns=demo-trivia-night-default-rtdb'
      };
    }
    return root.TRIVIA_FIREBASE_CONFIG || null;
  }
  function isSetUp() { return !!config(); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = function () { reject(new Error('Couldn\'t load ' + src)); };
      document.head.appendChild(s);
    });
  }

  var connecting = null;
  // Resolves to { db, uid, serverNow(), TS } once signed in.
  function connect() {
    if (connecting) return connecting;
    connecting = (async function () {
      var cfg = config();
      if (!cfg) throw new Error('Live games aren\'t set up yet.');
      var base = 'https://www.gstatic.com/firebasejs/' + SDK + '/';
      if (!root.firebase) await loadScript(base + 'firebase-app-compat.js');
      await loadScript(base + 'firebase-auth-compat.js');
      await loadScript(base + 'firebase-database-compat.js');
      var fb = root.firebase;
      if (!fb.apps.length) fb.initializeApp(cfg);
      var auth = fb.auth();
      var db = fb.database();
      if (useEmulator()) {
        auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        db.useEmulator('127.0.0.1', 9000);
      }
      // Reuse this browser's id if it has one, so a refresh keeps your team.
      var user = await new Promise(function (resolve) {
        var off = auth.onAuthStateChanged(function (u) { off(); resolve(u); });
      });
      if (!user) user = (await auth.signInAnonymously()).user;
      var offset = 0;
      db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
      return {
        db: db,
        uid: user.uid,
        serverNow: function () { return Date.now() + offset; },
        TS: fb.database.ServerValue.TIMESTAMP,
        room: function (code, path) { return db.ref('rooms/' + code + (path ? '/' + path : '')); },
        onConnection: function (fn) { db.ref('.info/connected').on('value', function (s) { fn(!!s.val()); }); }
      };
    })();
    connecting.catch(function () { connecting = null; });
    return connecting;
  }

  // Claim a fresh room code. Tries a few in case one is taken.
  async function createRoom(ctx) {
    for (var i = 0; i < 8; i++) {
      var code = newCode();
      try {
        await ctx.room(code, 'host').set(ctx.uid);
        await ctx.room(code, 'createdAt').set(ctx.TS);
        return code;
      } catch (e) { /* taken: try another */ }
    }
    throw new Error('Couldn\'t create a room. Check your connection and try again.');
  }

  function inviteUrl(code) {
    return new URL('../play/?room=' + code, root.location.href).href.replace(/[?&]emulator\b/, '');
  }

  var api = {
    newCode: newCode, cleanCode: cleanCode, slug: slug, project: project,
    isSetUp: isSetUp, connect: connect, createRoom: createRoom, inviteUrl: inviteUrl
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriviaLive = api;
})(typeof window !== 'undefined' ? window : globalThis);
