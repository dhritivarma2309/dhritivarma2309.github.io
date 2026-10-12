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
  // Rooms end 12 hours after they're created, so a forgotten test room can't
  // linger: the host's browser deletes it on its next visit, and players are
  // told it has ended. A room with no creation time counts as ended too.
  var ROOM_HOURS = 12;
  function isExpired(createdAt, now) {
    return typeof createdAt !== 'number' || now - createdAt > ROOM_HOURS * 3600 * 1000;
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
        // There's no timer, but the database rules only accept buzzes before
        // `deadline`, so it's set far out (6 hours) to keep buzzers open.
        deadline: state.q.openedAt + 6 * 3600 * 1000,
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
      var ctx = {
        db: db,
        auth: auth,
        // Who's signed in now: a Google account (the host) or an anonymous player.
        get uid() { return auth.currentUser ? auth.currentUser.uid : null; },
        user: function () {
          var u = auth.currentUser;
          if (!u || u.isAnonymous) return null;
          return { uid: u.uid, name: u.displayName || u.email || 'you', email: u.email || '' };
        },
        onAuth: function (fn) { return auth.onAuthStateChanged(function () { fn(ctx.user()); }); },
        serverNow: function () { return Date.now() + offset; },
        TS: fb.database.ServerValue.TIMESTAMP,
        room: function (code, path) { return db.ref('rooms/' + code + (path ? '/' + path : '')); },
        onConnection: function (fn) { db.ref('.info/connected').on('value', function (s) { fn(!!s.val()); }); }
      };
      return ctx;
    })();
    connecting.catch(function () { connecting = null; });
    return connecting;
  }

  // Host sign-in with a Google account (a pop-up window). Players never need it.
  async function signIn() {
    var ctx = await connect();
    var provider = new root.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await ctx.auth.signInWithPopup(provider);
    } catch (e) {
      if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return null;
      if (e && e.code === 'auth/popup-blocked') throw new Error('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.');
      if (e && e.code === 'auth/unauthorized-domain') throw new Error('Sign-in isn\'t allowed on this address yet. Add it under Firebase → Authentication → Settings → Authorized domains.');
      throw new Error('Couldn\'t sign in. Try again.');
    }
    return ctx.user();
  }

  // Back to an anonymous id, so this browser can still play and host.
  async function signOut() {
    var ctx = await connect();
    await ctx.auth.signOut();
    await ctx.auth.signInAnonymously();
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
    newCode: newCode, cleanCode: cleanCode, isExpired: isExpired, ROOM_HOURS: ROOM_HOURS, slug: slug, project: project,
    isSetUp: isSetUp, connect: connect, signIn: signIn, signOut: signOut,
    createRoom: createRoom, inviteUrl: inviteUrl
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriviaLive = api;
})(typeof window !== 'undefined' ? window : globalThis);
