/* ==========================================================================
   Music page: renders everything from data/music.js
   ========================================================================== */
(function () {
  'use strict';

  var M = window.MUSIC;
  if (!M) return;

  var SWATCHES = ['var(--peach)', 'var(--sky)', 'var(--sage)', 'var(--lilac)'];

  // ---------- helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function get(obj, path) { return path.split('.').reduce(function (o, k) { return o && o[k]; }, obj); }
  function isPlaceholder(s) { return /^\[.*\]$/.test(String(s || '').trim()); }

  // Turn any Spotify link / URI into { type, id, open, embed }
  function spotify(link) {
    if (!link) return null;
    var m = String(link).match(/(track|album|playlist|episode|artist)[/:]([A-Za-z0-9]{10,})/);
    if (!m) return null;
    return {
      type: m[1],
      id: m[2],
      open: 'https://open.spotify.com/' + m[1] + '/' + m[2],
      embed: 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator',
    };
  }

  function cover(src, i, alt, label) {
    var bg = SWATCHES[i % SWATCHES.length];
    if (src) return '<div class="cover" style="background:' + bg + '"><img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.remove()"></div>';
    return '<div class="cover" style="background:' + bg + '"><span class="tag">' + (label || 'Cover art') + '</span></div>';
  }

  function textNode(el, value) {
    el.textContent = value;
    if (isPlaceholder(value)) el.classList.add('placeholder');
  }

  // ---------- simple text bindings ----------

  $$('[data-bind]').forEach(function (el) {
    var v = get(M, el.getAttribute('data-bind'));
    if (v != null) textNode(el, v);
  });

  // ---------- hybrid player: one open at a time ----------

  var openCard = null;

  function closePlayer(card) {
    if (!card) return;
    var p = $('[data-player]', card);
    p.classList.remove('is-open');
    p.innerHTML = '';
    card.classList.remove('is-playing');
    var t = $('[data-toggle-label]', card);
    if (t) t.innerHTML = '<span class="play"></span>Listen';
    if (openCard === card) openCard = null;
    if (card._onClose) card._onClose();
  }

  function openPlayer(card, sp, opts) {
    if (!sp) return;
    if (openCard && openCard !== card) closePlayer(openCard);
    var p = $('[data-player]', card);
    var h = (opts && opts.height) || (sp.type === 'track' || sp.type === 'episode' ? 152 : (opts && opts.tall ? 380 : 352));
    p.innerHTML =
      '<iframe src="' + sp.embed + '" height="' + h + '" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify player"></iframe>' +
      '<div class="player-foot"><small>' + ((opts && opts.caption) || 'Player by Spotify.') + ' Hearing a preview? Open in Spotify for the full track.</small>' +
      '<div class="player-actions">' +
        '<a class="btn btn--solid" href="' + sp.open + '" target="_blank" rel="noopener">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>Open in Spotify</a>' +
        '<button class="btn" data-hide>Hide player</button>' +
      '</div></div>';
    p.classList.add('is-open');
    card.classList.add('is-playing');
    var t = $('[data-toggle-label]', card);
    if (t) t.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor"/></svg>Hide player';
    openCard = card;
    $('[data-hide]', p).addEventListener('click', function () { closePlayer(card); });
  }

  // Every play / Listen button opens the song or album in Spotify (new tab; the Spotify app on phones),
  // where signed-in listeners hear the full track. No in-page player, so no 30-second previews.
  function openSpotify(sp) {
    if (!sp) return;
    // a real link click: opens a new tab without being caught by pop-up blockers
    var a = document.createElement('a');
    a.href = sp.open; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function listenButton(sp, label) {
    return '<button class="btn btn--solid" data-listen' + (sp ? '' : ' disabled title="Add a Spotify link in data/music.js"') + '><span class="play"></span>' + (label || 'Listen') + '</button>';
  }
  function openButton(sp) {
    var attrs = sp ? 'href="' + sp.open + '" target="_blank" rel="noopener"' : 'aria-disabled="true" tabindex="-1" style="opacity:.45;pointer-events:none"';
    return '<a class="btn" ' + attrs + '><svg class="spotify-mark" aria-hidden="true"><use href="#i-listen"/></svg>Open in Spotify</a>';
  }

  // ---------- 02 · Discover carousel ----------

  (function discover() {
    var PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2.5v9l7.5-4.5z" fill="currentColor"/></svg>';
    var STOP_ICON = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor"/></svg>';
    var card = $('#discover');
    if (!card) return;
    var track = $('[data-slot="discover"]', card);
    var dots = $('[data-slot="dots"]', card);
    var D = M.discover || {};
    var themes = Array.isArray(D) ? [{ name: 'Discover New', blurb: '', songs: D }] : (D.themes || []);
    var t = 0, idx = 0, items = [];
    var nameEl = $('[data-theme-name]', card), blurbEl = $('[data-theme-blurb]', card), label = $('.theme-label', card);

    function renderTheme(n, dir) {
      t = (n + themes.length) % themes.length;
      var th = themes[t];
      items = th.songs || [];
      if (openCard === card) closePlayer(card);

      nameEl.textContent = th.name; nameEl.classList.toggle('placeholder', isPlaceholder(th.name));
      blurbEl.textContent = th.blurb || ''; blurbEl.classList.toggle('placeholder', isPlaceholder(th.blurb));
      if (dir) { label.classList.remove('flip-l', 'flip-r'); void label.offsetWidth; label.classList.add(dir < 0 ? 'flip-l' : 'flip-r'); }

      track.style.transition = 'none';
      track.innerHTML = items.map(function (s, i) {
        var sp = spotify(s.spotify);
        var art = cover(s.cover, i + t, s.title + ' cover');
        var title = esc(s.title);
        return '<article class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + items.length + '">' +
          '<div class="polaroid">' + (sp ? '<a class="cover-link" href="' + sp.open + '" target="_blank" rel="noopener" title="Open in Spotify">' + art + '</a>' : art) + '</div>' +
          '<div>' +
            (s.hypothesis ? '<p class="hypothesis">' + esc(s.hypothesis) + '</p>' : '') +
            '<h3' + (isPlaceholder(s.title) ? ' class="placeholder"' : '') + '>' + (sp ? '<a class="title-link" href="' + sp.open + '" target="_blank" rel="noopener" title="Open in Spotify">' + title + '</a>' : title) + '</h3>' +
            '<p class="by">' + esc(s.artist) + '</p>' +
            '<div class="actions">' +
              '<button class="track-play track-play--lg" data-listen' + (sp ? '' : ' disabled') + ' aria-label="Play ' + title + '">' + PLAY_ICON + '</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');
      dots.innerHTML = items.map(function (_, i) {
        return '<button class="dot" role="tab" aria-label="Song ' + (i + 1) + '"></button>';
      }).join('');
      $$('.dot', dots).forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
      go(0);
      void track.offsetWidth; track.style.transition = '';
    }

    function go(n) {
      if (!items.length) return;
      idx = (n + items.length) % items.length;
      track.style.transform = 'translateX(' + (-100 * idx) + '%)';
      $$('.dot', dots).forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
      $$('.slide', track).forEach(function (s, i) { s.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); s.inert = i !== idx; });
      if (openCard === card) closePlayer(card);
    }

    $('[data-theme-prev]', card).addEventListener('click', function () { renderTheme(t - 1, -1); });
    $('[data-theme-next]', card).addEventListener('click', function () { renderTheme(t + 1, 1); });
    $('[data-prev]', card).addEventListener('click', function () { go(idx - 1); });
    $('[data-next]', card).addEventListener('click', function () { go(idx + 1); });
    card.addEventListener('keydown', function (e) {
      if (e.target.closest('iframe')) return;
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
    });

    // swipe songs on touch
    var x0 = null;
    track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    track.addEventListener('click', function (e) {
      if (!e.target.closest('[data-listen]')) return;
      openSpotify(spotify(items[idx].spotify));
    });

    renderTheme(0);
  })();

  // ---------- 03 · On rotation ----------

  (function rotation() {
    var card = $('#rotation');
    if (!card) return;
    var R = M.onRotation || { tracks: [] };
    var list = $('[data-slot="rotation"]', card);
    var playIcon = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2.5v9l7.5-4.5z" fill="currentColor"/></svg>';
    var stopIcon = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor"/></svg>';
    var current = null;

    list.innerHTML = R.tracks.map(function (t, i) {
      var bg = SWATCHES[i % SWATCHES.length];
      var sp = spotify(t.spotify);
      var art = '<span class="thumb" style="background:' + bg + '">' + (t.cover ? '<img src="' + esc(t.cover) + '" alt="" loading="lazy">' : '') + '</span>';
      var title = esc(t.title);
      return '<li>' +
        '<span class="num">' + (i + 1) + '</span>' +
        art +
        '<span class="track-text"><span class="t' + (isPlaceholder(t.title) ? ' placeholder' : '') + '">' +
          (sp ? '<a class="row-link" href="' + sp.open + '" target="_blank" rel="noopener" title="Listen on Spotify">' + title + '<span class="sr-only"> (opens Spotify)</span></a>' : title) +
        '</span><span class="a">' + esc(t.artist) + '</span></span>' +
        '<span class="note">' + (t.note ? '<svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 6H3M7 1L2 6l5 5"/></svg>' + esc(t.note) : '') + '</span>' +
        '<span class="len">' + esc(t.length) + '</span>' +
        '<button class="track-play" data-i="' + i + '"' + (sp ? '' : ' disabled') + ' aria-label="Play ' + title + '">' + playIcon + '</button>' +
      '</li>';
    }).join('');

    var rows = $$('li', list);
    function setActive(i) {
      rows.forEach(function (r, j) {
        var on = j === i;
        r.classList.toggle('is-active', on);
        var b = $('.track-play', r);
        b.innerHTML = on ? stopIcon : playIcon;
        b.setAttribute('aria-label', (on ? 'Stop ' : 'Play ') + R.tracks[j].title);
      });
    }
    card._onClose = function () { current = null; setActive(-1); };

    list.addEventListener('click', function (e) {
      var b = e.target.closest('.track-play');
      if (!b) return;
      openSpotify(spotify(R.tracks[+b.getAttribute('data-i')].spotify));
    });
  })();

  // ---------- 04 · Album ratings ----------

  (function albums() {
    var slot = $('[data-slot="albums"]');
    if (!slot) return;
    // order by Rolling Stone rank (#1 first); unranked albums go last
    var rk = function (a) { var n = parseInt(a.rsRank, 10); return isNaN(n) ? Infinity : n; };
    var ALL = (M.albums || []).slice().sort(function (a, b) { return rk(a) - rk(b); });
    var tiers = {}; (M.rubric || []).forEach(function (t) { tiers[t.key] = t; });
    var ring = '<svg viewBox="0 0 100 50" preserveAspectRatio="none" fill="none" stroke="#c0352b" stroke-width="2.2" stroke-linecap="round"><path d="M60 3C30 1 3 9 3 26s28 22 52 21 42-8 42-23S72 2 44 4"/></svg>';

    var PLAY = '<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2.5v9l7.5-4.5z" fill="currentColor"/></svg>';

    // One compact row per album: rank · cover · title/artist · favorite song · my rating · play (opens Spotify)
    function rowHTML(a, i) {
      var sp = spotify(a.spotify);
      var t = tiers[a.rating];
      var fav = a.favoriteSong || a.bestSong || '';
      var rank = a.rsRank
        ? (M.rsList ? '<a class="rk" href="' + esc(M.rsList) + '" target="_blank" rel="noopener" title="Rolling Stone\'s 500 Greatest Albums of All Time" aria-label="Number ' + esc(a.rsRank) + ' on Rolling Stone\'s 500 Greatest Albums of All Time">#' + esc(a.rsRank) + '</a>' : '<span class="rk">#' + esc(a.rsRank) + '</span>')
        : '<span class="rk rk--none">–</span>';
      var art = '<span class="ar-cover" style="background:' + SWATCHES[i % SWATCHES.length] + '">' + (a.cover ? '<img src="' + esc(a.cover) + '" alt="' + esc(a.title) + ' cover" loading="lazy" onerror="this.remove()">' : '') + '</span>';
      return '<li class="arow">' +
        rank +
        (sp ? '<a class="ar-art" href="' + sp.open + '" target="_blank" rel="noopener" title="Open in Spotify" tabindex="-1" aria-hidden="true">' + art + '</a>' : art) +
        '<span class="ar-text">' +
          '<span class="ar-title' + (isPlaceholder(a.title) ? ' placeholder' : '') + '">' +
            (sp ? '<a href="' + sp.open + '" target="_blank" rel="noopener" title="Open in Spotify">' + esc(a.title) + '</a>' : esc(a.title)) +
          '</span>' +
          '<span class="ar-artist">' + esc(a.artist) + (a.year ? '<span class="ar-year"> · ' + esc(a.year) + '</span>' : '') + '</span>' +
          (fav ? '<span class="ar-fav-m"><span aria-hidden="true">♥</span> ' + esc(fav) + '</span>' : '') +
        '</span>' +
        '<span class="ar-fav">' + (fav ? '<span class="sr-only">Favorite song: </span>' + esc(fav) : '') + '</span>' +
        (t ? '<span class="ar-rating" role="img" title="' + esc(t.label) + '" aria-label="My rating: ' + esc(t.label) + '">' + t.emoji + '</span>' : '<span></span>') +
        '<button class="track-play" data-listen' + (sp ? '' : ' disabled') + ' aria-label="Play ' + esc(a.title) + ' on Spotify" title="Play on Spotify">' + PLAY + '</button>' +
      '</li>';
    }

    var shown = [];
    function render(list) {
      shown = list;
      slot.classList.add('paper', 'album-rows');
      slot.innerHTML =
        '<div class="ar-head" aria-hidden="true"><span>RS #</span><span></span><span>Album</span><span>Favorite song</span><span>Me</span><span></span></div>' +
        '<ol class="ar-list">' + list.map(rowHTML).join('') + '</ol>';
      slot.hidden = !list.length;
    }
    slot.addEventListener('click', function (e) {
      var b = e.target.closest('[data-listen]');
      if (!b) return;
      var rows = $$('.arow', slot);
      openSpotify(spotify(shown[rows.indexOf(b.closest('.arow'))].spotify));
    });

    // Music page shows the first few (data-limit); the "See all" page adds filters + search
    var limit = parseInt(slot.getAttribute('data-limit'), 10);
    var filters = $('[data-slot="album-filters"]');
    if (!filters) {
      render(isNaN(limit) ? ALL : ALL.slice(0, limit));
      var more = $('[data-slot="see-all"]');
      if (more) {
        more.hidden = !ALL.length;
      }
    } else {
      setupFilters(filters);
    }

    function setupFilters(box) {
      var RANGES = [[1, 100], [101, 200], [201, 300], [301, 400], [401, 500]];
      var params = new URLSearchParams(location.search);
      var state = { q: params.get('q') || '', rating: params.get('rating') || '', rs: params.get('rs') || '' };

      function count(fn) { return ALL.filter(fn).length; }
      function chip(group, value, label, n) {
        return '<button type="button" class="chip" data-group="' + group + '" data-value="' + value + '" aria-pressed="false">' + label +
          (n != null ? ' <span class="n">' + n + '</span>' : '') + '</button>';
      }
      box.innerHTML =
        '<label class="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<span class="sr-only">Search by artist or album</span><input type="search" data-q placeholder="Search by artist or album" autocomplete="off"></label>' +
        '<div class="filter-row"><span class="filter-label">My rating</span><div class="chips" role="group" aria-label="Filter by my rating">' +
          chip('rating', '', 'All') +
          (M.rubric || []).map(function (t) { return chip('rating', t.key, '<span class="emoji" aria-hidden="true">' + t.emoji + '</span>' + esc(t.label), count(function (a) { return a.rating === t.key; })); }).join('') +
        '</div></div>' +
        '<div class="filter-row"><span class="filter-label">Rolling Stone rank</span><div class="chips" role="group" aria-label="Filter by Rolling Stone rank">' +
          chip('rs', '', 'All') +
          RANGES.map(function (r) { return chip('rs', r[0] + '-' + r[1], '#' + r[0] + '–' + r[1], count(function (a) { var n = rk(a); return n >= r[0] && n <= r[1]; })); }).join('') +
        '</div></div>' +
        '<div class="filter-foot"><p class="result-count" aria-live="polite" data-result></p><button type="button" class="link-btn" data-clear>Clear filters</button></div>';

      var input = $('[data-q]', box);
      input.value = state.q;

      function apply() {
        var q = state.q.trim().toLowerCase();
        var range = state.rs ? state.rs.split('-').map(Number) : null;
        var list = ALL.filter(function (a) {
          if (state.rating && a.rating !== state.rating) return false;
          if (range) { var n = rk(a); if (!(n >= range[0] && n <= range[1])) return false; }
          if (q && (a.title + ' ' + a.artist).toLowerCase().indexOf(q) === -1) return false;
          return true;
        });
        $$('.chip', box).forEach(function (c) {
          c.setAttribute('aria-pressed', String(state[c.getAttribute('data-group')] === c.getAttribute('data-value')));
        });
        var active = state.q || state.rating || state.rs;
        $('[data-clear]', box).hidden = !active;
        $('[data-result]', box).textContent = list.length === ALL.length
          ? 'All ' + ALL.length + ' albums'
          : 'Showing ' + list.length + ' of ' + ALL.length + ' albums';
        render(list);
        var empty = $('[data-slot="albums-empty"]');
        if (empty) empty.hidden = list.length > 0;
        // keep the filters in the address bar so a filtered view can be shared
        var p = new URLSearchParams();
        if (state.q) p.set('q', state.q);
        if (state.rating) p.set('rating', state.rating);
        if (state.rs) p.set('rs', state.rs);
        var qs = p.toString();
        try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
      }

      box.addEventListener('click', function (e) {
        var c = e.target.closest('.chip');
        if (c) { state[c.getAttribute('data-group')] = c.getAttribute('data-value'); apply(); return; }
        if (e.target.closest('[data-clear]')) { state = { q: '', rating: '', rs: '' }; input.value = ''; apply(); }
      });
      input.addEventListener('input', function () { state.q = input.value; apply(); });
      $$('[data-clear-filters]').forEach(function (b) { b.addEventListener('click', function () { state = { q: '', rating: '', rs: '' }; input.value = ''; apply(); input.focus(); }); });
      apply();
    }

    // Rating key under the cards
    var key = $('[data-slot="rubric"]');
    if (key && M.rubric) {
      key.innerHTML = '<p class="rubric-title">Rating rubric</p><ul>' + M.rubric.map(function (t) {
        return '<li><span class="emoji" aria-hidden="true">' + t.emoji + '</span><div><strong>' + esc(t.label) + '</strong><span>' + esc(t.note) + '</span></div></li>';
      }).join('') + '</ul>';
    }

    // Note card under the rubric
    var story = $('[data-slot="story"]'), st = M.albumsStory;
    if (story) {
      if (st && st.paragraphs && st.paragraphs.length) {
        story.innerHTML = '<p class="rubric-title">' + esc(st.title || '') + '</p>' +
          (function () {
            // two balanced columns: the last paragraph on the right, everything before it on the left
            var ps = st.paragraphs.map(function (t) { return '<p class="story-p">' + esc(t) + '</p>'; });
            if (ps.length < 2) return '<div class="story-cols one">' + ps.join('') + '</div>';
            return '<div class="story-cols"><div>' + ps.slice(0, -1).join('') + '</div><div>' + ps[ps.length - 1] + '</div></div>';
          })();
      } else story.remove();
    }
  })();

  // ---------- Lab results: pencil-sketch bar chart ----------

  (function chart() {
    var svg = $('[data-slot="chart"]');
    var L = M.listening;
    if (!svg || !L) return;

    // seeded wobble so the sketch looks hand-drawn but stable between loads
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    function j(v, amt) { return (v + (rnd() - 0.5) * (amt || 2.4)).toFixed(1); }
    function line(x1, y1, x2, y2) {
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return 'M' + j(x1) + ' ' + j(y1) + ' Q' + j(mx, 3) + ' ' + j(my, 3) + ' ' + j(x2) + ' ' + j(y2);
    }

    var x0 = 50, y0 = 270, w = 470, top = 30;
    var bars = L.bars || [];
    var max = Math.max.apply(null, bars.map(function (b) { return b.value; })) || 1;
    var slotW = w / bars.length, bw = Math.min(70, slotW * 0.62);
    var out = '<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#7d8798" stroke-width="1.2"/></pattern></defs>';
    out += '<g fill="none" stroke="#1f2a44" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
    out += '<path d="' + line(x0, top - 10, x0, y0) + '"/>';
    out += '<path d="' + line(x0 - 4, y0, x0 + w + 20, y0) + '"/>';

    var surpriseAt = null;
    bars.forEach(function (b, i) {
      var h = (b.value / max) * (y0 - top - 20);
      var x = x0 + slotW * i + (slotW - bw) / 2, y = y0 - h;
      if (b.surprise) {
        out += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" fill="url(#hatch)" stroke="none"/>';
        surpriseAt = { x: x + bw / 2, y: y };
      }
      out += '<path d="' + line(x, y0, x, y) + ' ' + line(x, y, x + bw, y).replace('M', 'L') + ' ' + line(x + bw, y, x + bw, y0).replace('M', 'L') + '"/>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (y0 + 30) + '" text-anchor="middle" font-family="Caveat, cursive" font-size="22" fill="#1f2a44" stroke="none" transform="rotate(-3 ' + (x + bw / 2) + ' ' + (y0 + 30) + ')">' + esc(b.label) + '</text>';
    });
    out += '</g>';

    if (surpriseAt) {
      var sx = surpriseAt.x, sy = surpriseAt.y;
      out += '<g fill="none" stroke="#c0352b" stroke-width="1.8" stroke-linecap="round">' +
        '<path d="M' + (sx + 130) + ' ' + (sy + 4) + ' C ' + (sx + 90) + ' ' + (sy - 14) + ', ' + (sx + 50) + ' ' + (sy - 10) + ', ' + (sx + 14) + ' ' + (sy + 8) + '"/>' +
        '<path d="M' + (sx + 16) + ' ' + (sy - 6) + ' l-3 14 14 0"/></g>' +
        '<text x="' + (sx + 136) + '" y="' + (sy + 12) + '" font-family="Caveat, cursive" font-size="28" fill="#c0352b">[surprise!]</text>';
    }
    svg.innerHTML = out;
  })();

  // ---------- Thoughts: blog post cards ----------

  (function thoughts() {
    var slot = $('[data-slot="thoughts"]');
    if (!slot) return;
    var colors = ['var(--sky)', 'var(--lilac)', 'var(--sage)'];
    function ph(s) { return isPlaceholder(s) ? ' placeholder' : ''; }
    slot.innerHTML = (M.thoughts || []).map(function (a, i) {
      var live = !!a.href;
      var tag = live ? 'a href="' + esc(a.href) + '"' : 'div aria-disabled="true"';
      var meta = [a.date, a.minutes ? a.minutes + ' min read' : ''].filter(Boolean).map(esc).join(' · ');
      return '<' + tag + ' class="paper article-card tape">' +
        '<div class="header-img" style="background:' + colors[i % 3] + '">' +
          (a.image ? '<img src="' + esc(a.image) + '" alt="" loading="lazy">' : '') +
          (a.topic ? '<span class="topic' + ph(a.topic) + '">' + esc(a.topic) + '</span>' : '') +
        '</div>' +
        '<h3 class="' + ph(a.title).trim() + '">' + esc(a.title) + '</h3>' +
        (a.blurb ? '<p class="blurb' + ph(a.blurb) + '">' + esc(a.blurb) + '</p>' : '') +
        '<p class="meta">' + meta + (live ? '' : '<span class="soon">coming soon</span>') + '</p>' +
      '</' + (live ? 'a' : 'div') + '>';
    }).join('');
  })();
})();
