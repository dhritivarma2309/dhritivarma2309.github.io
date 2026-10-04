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
  }

  function openPlayer(card, sp, opts) {
    if (!sp) return;
    if (openCard && openCard !== card) closePlayer(openCard);
    var p = $('[data-player]', card);
    var h = sp.type === 'track' || sp.type === 'episode' ? 152 : (opts && opts.tall ? 380 : 352);
    p.innerHTML =
      '<iframe src="' + sp.embed + '" height="' + h + '" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify player"></iframe>' +
      '<div class="player-foot"><small>Player by Spotify. Previews play when logged out.</small>' +
      '<button class="btn" data-hide>Hide player</button></div>';
    p.classList.add('is-open');
    card.classList.add('is-playing');
    var t = $('[data-toggle-label]', card);
    if (t) t.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor"/></svg>Hide player';
    openCard = card;
    $('[data-hide]', p).addEventListener('click', function () { closePlayer(card); });
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
    var card = $('#discover');
    var track = $('[data-slot="discover"]', card);
    var dots = $('[data-slot="dots"]', card);
    var items = M.discover || [];
    var idx = 0;

    track.innerHTML = items.map(function (s, i) {
      var sp = spotify(s.spotify);
      return '<article class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + items.length + '">' +
        '<div class="polaroid">' + cover(s.cover, i, s.title + ' cover') + '</div>' +
        '<div>' +
          (s.hypothesis ? '<p class="hypothesis">' + esc(s.hypothesis) + '</p>' : '') +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p class="by">' + esc(s.artist) + (s.album && !isPlaceholder(s.album) ? ' · ' + esc(s.album) : '') + '</p>' +
          '<div class="actions hide-when-playing">' + listenButton(sp) + openButton(sp) + '</div>' +
        '</div>' +
      '</article>';
    }).join('');

    dots.innerHTML = items.map(function (_, i) {
      return '<button class="dot" role="tab" aria-label="Song ' + (i + 1) + '"></button>';
    }).join('');

    $('[data-bind="slide-total"]', card).textContent = items.length;

    function go(n) {
      idx = (n + items.length) % items.length;
      track.style.transform = 'translateX(' + (-100 * idx) + '%)';
      $$('.dot', dots).forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
      $$('.slide', track).forEach(function (s, i) { s.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); s.inert = i !== idx; });
      $('[data-bind="slide-index"]', card).textContent = idx + 1;
      if (openCard === card) closePlayer(card);
    }

    $('[data-prev]', card).addEventListener('click', function () { go(idx - 1); });
    $('[data-next]', card).addEventListener('click', function () { go(idx + 1); });
    $$('.dot', dots).forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    card.addEventListener('keydown', function (e) {
      if (e.target.closest('iframe')) return;
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
    });

    // swipe on touch
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
      openPlayer(card, spotify(items[idx].spotify));
    });

    go(0);
  })();

  // ---------- 03 · On rotation ----------

  (function rotation() {
    var card = $('#rotation');
    var R = M.onRotation || { tracks: [] };
    var sp = spotify(R.playlist);

    $('[data-slot="rotation"]', card).innerHTML = R.tracks.map(function (t, i) {
      var bg = SWATCHES[i % SWATCHES.length];
      return '<li>' +
        '<span class="num">' + (i + 1) + '</span>' +
        '<span class="thumb" style="background:' + bg + '">' + (t.cover ? '<img src="' + esc(t.cover) + '" alt="" loading="lazy">' : '') + '</span>' +
        '<span><span class="t' + (isPlaceholder(t.title) ? ' placeholder' : '') + '">' + esc(t.title) + '</span><br><span class="a">' + esc(t.artist) + '</span></span>' +
        '<span class="note">' + (t.note ? '<svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 6H3M7 1L2 6l5 5"/></svg>' + esc(t.note) : '') + '</span>' +
        '<span class="len">' + esc(t.length) + '</span>' +
      '</li>';
    }).join('');

    var open = $('[data-open-playlist]', card);
    var listen = $('[data-listen-playlist]', card);
    if (sp) { open.href = sp.open; }
    else {
      open.removeAttribute('href'); open.style.opacity = '.45'; open.style.pointerEvents = 'none';
      listen.disabled = true; listen.title = 'Add a Spotify playlist link in data/music.js';
    }
    listen.addEventListener('click', function () { openPlayer(card, sp, { tall: true }); });
  })();

  // ---------- 04 · Album ratings ----------

  (function albums() {
    var slot = $('[data-slot="albums"]');
    var scale = M.ratingScale || 5;
    var ring = '<svg viewBox="0 0 100 50" preserveAspectRatio="none" fill="none" stroke="#c0352b" stroke-width="2.2" stroke-linecap="round"><path d="M60 3C30 1 3 9 3 26s28 22 52 21 42-8 42-23S72 2 44 4"/></svg>';

    slot.innerHTML = (M.albums || []).map(function (a, i) {
      var sp = spotify(a.spotify);
      return '<article class="paper specimen tape" data-card>' +
        '<div class="specimen-meta"><span>' + esc(a.year) + '</span></div>' +
        '<div class="specimen-media">' +
          '<div class="polaroid">' + cover(a.cover, i, a.title + ' cover') + '</div>' +
          '<div class="player" data-player></div>' +
        '</div>' +
        '<div class="specimen-body">' +
          '<h3' + (isPlaceholder(a.title) ? ' class="placeholder"' : '') + '>' + esc(a.title) + '</h3>' +
          '<span class="rating" aria-label="Rated ' + esc(a.rating) + ' out of ' + scale + '">' + ring + esc(a.rating) + '/' + scale + '</span>' +
          '<p class="by">' + esc(a.artist) + '</p>' +
        '</div>' +
        '<p class="best"><span>Favorite song</span><strong>' + esc(a.favoriteSong || a.bestSong) + '</strong></p>' +
        '<div class="specimen-actions">' + listenButton(sp).replace('btn btn--solid', 'btn') + '</div>' +
      '</article>';
    }).join('');

    $$('.specimen', slot).forEach(function (card, i) {
      var b = $('[data-listen]', card);
      b.setAttribute('data-toggle-label', '');
      b.addEventListener('click', function () {
        if (card.classList.contains('is-playing')) { closePlayer(card); return; }
        openPlayer(card, spotify(M.albums[i].spotify));
      });
    });
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

  // ---------- 05 · Ticket + articles ----------

  (function liner() {
    var t = M.ticket;
    var ticket = $('[data-slot="ticket"]');
    if (t && ticket) {
      ticket.innerHTML =
        '<div><div class="admit">ADMIT ONE</div><div class="artist">' + esc(t.artist) + '</div><div class="where">' + esc(t.venue) + ' · ' + esc(t.date) + '</div></div>' +
        '<div class="stub"><span>No.</span><span>' + esc(t.number) + '</span></div>';
    }

    var colors = ['var(--sky)', 'var(--lilac)', 'var(--sage)'];
    $('[data-slot="articles"]').innerHTML = (M.articles || []).map(function (a, i) {
      var live = !!a.href;
      var tag = live ? 'a href="' + esc(a.href) + '"' : 'div aria-disabled="true"';
      return '<' + tag + ' class="paper article-card tape">' +
        '<div class="header-img" style="background:' + colors[i % 3] + '">' +
          (a.image ? '<img src="' + esc(a.image) + '" alt="" loading="lazy">' : '<span class="tag" style="position:absolute;left:10px;bottom:12px;font:500 11px/1 var(--mono);background:var(--tape);padding:5px 7px;transform:rotate(-2deg)">Header image</span>') +
        '</div>' +
        '<h3' + (isPlaceholder(a.title) ? ' class="placeholder"' : '') + '>' + esc(a.title) + '</h3>' +
        '<p class="meta">' + esc(a.minutes) + ' min read' + (live ? '' : '<span class="soon">coming soon</span>') + '</p>' +
      '</' + (live ? 'a' : 'div') + '>';
    }).join('');
  })();
})();
