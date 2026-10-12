/* ==========================================================================
   TRIVIA NIGHT · game rules
   --------------------------------------------------------------------------
   All the rules live here, with no screen code. Every function takes the
   current game state and returns a NEW state (it never changes the old one).
   The single-device game uses it today; the live multiplayer version will
   reuse the same rules, so a game plays the same way everywhere.

   Rules (from the v1 spec):
   - Board: 6 categories x 5 questions, worth 100-500 points.
   - The host picks the first tile; after that, the team that last answered
     correctly picks. The host can override who picks.
   - Buzzers open the moment a question appears. Each team buzzes once.
     Buzzes are ranked by time; the first team in line answers.
   - Correct: +tile value, tile closes, that team picks next.
   - Wrong: -tile value, the next team in the buzz order answers.
   - Timer: 30 seconds. When it ends, nobody new can buzz, but teams already
     in line can still answer.
   - The tile closes on a correct answer, or when nobody is left to answer.
   ========================================================================== */

(function (root) {
  'use strict';

  var VALUES = [100, 200, 300, 400, 500];
  var QUESTION_MS = 30000;
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
      picker: null,        // team id that picks next; null = the host picks
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
  function timeLeft(s, now) {
    if (!s.q) return 0;
    return Math.max(0, s.q.deadline - now);
  }
  function canBuzz(s, teamId, now) {
    if (s.phase !== 'question' || !s.q || s.q.winner) return false;
    if (now >= s.q.deadline) return false;
    if (!findTeam(s, teamId)) return false;
    return !s.q.buzzes.some(function (b) { return b.team === teamId; });
  }
  // Each buzz with its place (1, 2, 3...) and gap behind the first buzz (ms).
  function buzzOrder(s) {
    if (!s.q || !s.q.buzzes.length) return [];
    var first = s.q.buzzes[0].at;
    var now = answering(s);
    return s.q.buzzes.map(function (b, i) {
      var status = s.q.winner === b.team ? 'correct'
        : s.q.wrong[b.team] ? 'wrong'
        : b.team === now ? 'answering' : 'waiting';
      return { place: i + 1, team: b.team, gap: b.at - first, status: status };
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
      openedAt: now, deadline: now + QUESTION_MS,
      buzzes: [],     // [{ team, at }] in the order they arrived
      wrong: {},      // teamId -> true
      winner: null,
      ended: null     // why it closed: correct | nobody | revealed | skipped
    };
    return n;
  }

  function buzz(s, teamId, now) {
    if (!canBuzz(s, teamId, now)) return s;
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

  // Close the tile when nobody is left who could still answer.
  function settle(n, now) {
    if (n.phase !== 'question' || n.q.winner || answering(n)) return n;
    var everyoneTried = n.teams.every(function (t) { return n.q.wrong[t.id]; });
    if (everyoneTried || now >= n.q.deadline) close(n, 'nobody');
    return n;
  }

  // correct: true / false. Judges the team whose turn it is.
  function judge(s, correct, now) {
    if (s.phase !== 'question') return s;
    var id = answering(s);
    if (!id) return s;
    var n = copy(s);
    var team = findTeam(n, id);
    if (correct) {
      team.score += n.q.value;
      n.q.winner = id;
      n.picker = id;
      close(n, 'correct');
      return n;
    }
    team.score -= n.q.value;
    n.q.wrong[id] = true;
    return settle(n, now);
  }

  // Call regularly while a question is open (handles the timer running out).
  function tick(s, now) {
    if (s.phase !== 'question') return s;
    if (now < s.q.deadline || answering(s)) return s;
    return settle(copy(s), now);
  }

  // Host shows the answer early: no more points change on this tile.
  function reveal(s) {
    if (s.phase !== 'question') return s;
    var n = copy(s);
    close(n, 'revealed');
    return n;
  }

  // Host throws the question out (e.g. a mistake in it). Scores from this
  // tile are undone, and the tile is closed.
  function skip(s) {
    if (s.phase !== 'question') return s;
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

  function setPicker(s, teamId) {
    if (teamId !== null && !findTeam(s, teamId)) return s;
    var n = copy(s);
    n.picker = teamId;
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
    VALUES: VALUES, QUESTION_MS: QUESTION_MS, MAX_TEAMS: MAX_TEAMS,
    createGame: createGame,
    tileCount: tileCount, isPlayed: isPlayed, question: question, answering: answering,
    timeLeft: timeLeft, canBuzz: canBuzz, buzzOrder: buzzOrder, standings: standings,
    findTeam: findTeam,
    pick: pick, buzz: buzz, judge: judge, tick: tick, reveal: reveal, skip: skip,
    next: next, setPicker: setPicker, adjustScore: adjustScore, setScore: setScore, endGame: endGame
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriviaGame = api;
})(this);
