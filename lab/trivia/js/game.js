/* ==========================================================================
   TRIVIA NIGHT · game rules
   --------------------------------------------------------------------------
   All the rules live here, with no screen code. Every function takes the
   current game state and returns a NEW state (it never changes the old one).
   The single-device game uses it today; the live multiplayer version will
   reuse the same rules, so a game plays the same way everywhere.

   Rules (from the v1 spec, as updated after the first live test):
   - Board: 6 categories x 5 questions, worth 100-500 points.
   - The host always picks the tile (teams can call out which one they want).
   - Buzzers open the moment a question appears. Each team buzzes once.
     Buzzes are ranked by time (to the millisecond); the first team in line
     answers. There is no timer: buzzers stay open until the tile closes.
   - Correct: +tile value, and the answer is revealed straight away.
   - Wrong: -tile value, and the next team in the buzz order answers.
   - Otherwise the answer stays hidden until the host reveals it (or skips
     the question). Then the host goes back to the board.
   ========================================================================== */

(function (root) {
  'use strict';

  var VALUES = [100, 200, 300, 400, 500];
  var MAX_TEAMS = 4;

  function copy(s) { return JSON.parse(JSON.stringify(s)); }
  function key(c, r) { return c + '-' + r; }
  function findTeam(s, id) {
    for (var i = 0; i < s.teams.length; i++) if (s.teams[i].id === id) return s.teams[i];
    return null;
  }

  /* ---- Start a game ---------------------------------------------------- */

  // teams: [{ name, bot?, id? }]  (bot = simulated test team that buzzes by itself;
  // id lets the live game keep the team ids its players already use)
  function createGame(board, teams) {
    var seen = {};
    var list = [];
    (teams || []).forEach(function (t) {
      var name = String(t.name || '').trim();
      if (!name) return;
      var k = name.toLowerCase();
      if (seen[k]) throw new Error('Two teams can\'t share the name "' + name + '".');
      seen[k] = true;
      list.push({ id: t.id || 't' + (list.length + 1), name: name, score: 0, bot: !!t.bot });
    });
    if (list.length < 1) throw new Error('Add at least one team.');
    if (list.length > MAX_TEAMS) throw new Error('A game can have up to ' + MAX_TEAMS + ' teams.');
    return {
      v: 1,
      board: board,
      teams: list,
      played: {},          // "c-r" -> { winner: teamId | null }
      phase: 'board',      // board | question | reveal | final
      q: null              // the open question (see pick)
    };
  }

  /* ---- Helpers the screens use ----------------------------------------- */

  function tileCount(s) {
    return s.board.categories.length * VALUES.length;
  }
  function isPlayed(s, c, r) { return !!s.played[key(c, r)]; }
  function question(s) {
    if (!s.q) return null;
    var cat = s.board.categories[s.q.c];
    var item = cat.questions[s.q.r];
    return { category: cat.name, value: s.q.value, q: item.q, a: item.a };
  }
  // The team whose turn it is to answer, or null.
  function answering(s) {
    if (!s.q || s.q.winner) return null;
    for (var i = 0; i < s.q.buzzes.length; i++) {
      var id = s.q.buzzes[i].team;
      if (!s.q.wrong[id]) return id;
    }
    return null;
  }
  function canBuzz(s, teamId) {
    if (s.phase !== 'question' || !s.q || s.q.winner) return false;
    if (!findTeam(s, teamId)) return false;
    return !s.q.buzzes.some(function (b) { return b.team === teamId; });
  }
  // Where an open question stands, for the host's prompts:
  // answering | everyone-tried | open
  function status(s) {
    if (!s.q || s.phase !== 'question') return null;
    if (answering(s)) return 'answering';
    if (s.teams.every(function (t) { return s.q.wrong[t.id]; })) return 'everyone-tried';
    return 'open';
  }
  // Each buzz with its place (1, 2, 3...), when it came after the question
  // appeared (ms), and its gap behind the first buzz (ms).
  function buzzOrder(s) {
    if (!s.q || !s.q.buzzes.length) return [];
    var first = s.q.buzzes[0].at;
    var now = answering(s);
    return s.q.buzzes.map(function (b, i) {
      var status = s.q.winner === b.team ? 'correct'
        : s.q.wrong[b.team] ? 'wrong'
        : b.team === now ? 'answering' : 'waiting';
      return { place: i + 1, team: b.team, at: Math.max(0, b.at - s.q.openedAt), gap: b.at - first, status: status };
    });
  }
  function standings(s) {
    return s.teams.slice().sort(function (a, b) { return b.score - a.score; });
  }

  /* ---- Moves ----------------------------------------------------------- */

  function pick(s, c, r, now) {
    if (s.phase !== 'board') return s;
    var cat = s.board.categories[c];
    if (!cat || !cat.questions[r] || isPlayed(s, c, r)) return s;
    var n = copy(s);
    n.phase = 'question';
    n.q = {
      c: c, r: r, value: VALUES[r],
      openedAt: now,  // when the question appeared (buzz times count from here)
      buzzes: [],     // [{ team, at }] in time order
      wrong: {},      // teamId -> true
      winner: null,
      ended: null     // how it closed: correct | revealed | skipped
    };
    return n;
  }

  function buzz(s, teamId, now) {
    if (!canBuzz(s, teamId)) return s;
    var n = copy(s);
    // Keep the line in time order. (In a live game, buzzes can reach the host a
    // few milliseconds out of order; their server times decide who was first.)
    var i = n.q.buzzes.length;
    while (i > 0 && n.q.buzzes[i - 1].at > now && !n.q.wrong[n.q.buzzes[i - 1].team] && n.q.buzzes[i - 1].team !== answering(n)) i--;
    n.q.buzzes.splice(i, 0, { team: teamId, at: now });
    return n;
  }

  function close(n, why) {
    n.q.ended = why;
    n.played[key(n.q.c, n.q.r)] = { winner: n.q.winner };
    n.phase = 'reveal';
  }

  // correct: true / false. Judges the team whose turn it is.
  // Correct reveals the answer at once; wrong passes to the next team.
  function judge(s, correct) {
    if (s.phase !== 'question') return s;
    var id = answering(s);
    if (!id) return s;
    var n = copy(s);
    var team = findTeam(n, id);
    if (correct) {
      team.score += n.q.value;
      n.q.winner = id;
      close(n, 'correct');
    } else {
      team.score -= n.q.value;
      n.q.wrong[id] = true;
    }
    return n;
  }

  // Host shows the answer to everyone. No more points change on this tile.
  function reveal(s) {
    if (s.phase !== 'question') return s;
    var n = copy(s);
    close(n, n.q.winner ? 'correct' : 'revealed');
    return n;
  }

  // Host throws the question out (e.g. a mistake in it). Points lost on it
  // are given back, and the tile is closed. Not once someone got it right.
  function skip(s) {
    if (s.phase !== 'question' || s.q.winner) return s;
    var n = copy(s);
    Object.keys(n.q.wrong).forEach(function (id) { findTeam(n, id).score += n.q.value; });
    n.q.wrong = {};
    n.q.buzzes = [];
    close(n, 'skipped');
    return n;
  }

  // From the answer screen back to the board (or the final scores).
  function next(s) {
    if (s.phase !== 'reveal') return s;
    var n = copy(s);
    n.q = null;
    n.phase = Object.keys(n.played).length >= tileCount(n) ? 'final' : 'board';
    return n;
  }

  function adjustScore(s, teamId, delta) {
    if (!findTeam(s, teamId)) return s;
    var n = copy(s);
    findTeam(n, teamId).score += delta;
    return n;
  }

  // Host types a score directly (whole numbers only).
  function setScore(s, teamId, value) {
    var v = Math.round(Number(value));
    if (!findTeam(s, teamId) || !isFinite(v)) return s;
    var n = copy(s);
    findTeam(n, teamId).score = v;
    return n;
  }

  function endGame(s) {
    var n = copy(s);
    n.q = null;
    n.phase = 'final';
    return n;
  }

  var api = {
    VALUES: VALUES, MAX_TEAMS: MAX_TEAMS,
    createGame: createGame,
    tileCount: tileCount, isPlayed: isPlayed, question: question, answering: answering,
    canBuzz: canBuzz, status: status,
    buzzOrder: buzzOrder, standings: standings, findTeam: findTeam,
    pick: pick, buzz: buzz, judge: judge, reveal: reveal, skip: skip,
    next: next, adjustScore: adjustScore, setScore: setScore, endGame: endGame
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriviaGame = api;
})(this);
