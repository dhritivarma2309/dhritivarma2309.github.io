/* Lab page: renders project cards from data/lab.js */
(function () {
  var L = window.LAB || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isPh(s) { return /^\[.*\]$/.test(s || ''); }

  document.querySelectorAll('[data-bind]').forEach(function (el) {
    el.textContent = L[el.getAttribute('data-bind')] || '';
  });

  var swatches = ['var(--sky)', 'var(--peach)', 'var(--sage)', 'var(--lilac)'];
  var ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  var PLAY = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="margin-right:7px"><path d="M7 4.5v15l12-7.5z"/></svg>';

  var slot = document.querySelector('[data-slot="projects"]');
  if (!slot) return;
  slot.innerHTML = (L.projects || []).map(function (p, i) {
    var cs = p.caseStudy;
    var title = '<h2 class="' + (isPh(p.title) ? 'placeholder' : '') + '">' +
      (cs ? '<a class="card-link" href="' + esc(cs) + '">' + esc(p.title) + '</a>' : esc(p.title)) + '</h2>';
    var shot = p.image
      ? '<img src="' + esc(p.image) + '" alt="Screenshot of ' + esc(p.title) + '" loading="lazy">'
      : '<span class="shot-label">Screenshot</span>';
    var label = esc(p.cta || 'Try it');
    var tryBtn = p.video
      ? '<button class="btn btn--solid btn--sm try" type="button" data-video="' + esc(p.video) + '" data-title="' + esc(p.title) + '">' + PLAY + label + '</button>'
      : p.tryUrl
      ? '<a class="btn btn--solid btn--sm try" href="' + esc(p.tryUrl) + '" target="_blank" rel="noopener">' + label + ' ' + ARROW + '</a>'
      : '<span class="btn btn--solid btn--sm try" aria-disabled="true" title="Coming soon">' + (p.cta ? PLAY : '') + label + (p.cta ? '' : ' ' + ARROW) + '</span>';
    if (p.buttons && p.buttons.length) {
      var btns = p.buttons.map(function (b, j) {
        var cls = 'btn btn--sm try' + (b.solid ? ' btn--solid' : '');
        if (!b.href) return '<span class="' + cls + '" aria-disabled="true" title="Coming soon">' + esc(b.label) + '</span>';
        return '<a class="' + cls + '" href="' + esc(b.href) + '"' +
          (b.newTab ? ' target="_blank" rel="noopener"' : '') + '>' + esc(b.label) + (b.newTab ? ' ' + ARROW : '') + '</a>';
      }).join('');
      tryBtn = '<div class="card-btns">' + btns + '</div>';
    }
    var read = (p.buttons && p.buttons.length) ? '' : cs ? '<span class="read">Read the case study →</span>' : '<span class="soon">case study coming soon</span>';
    return '<article class="paper tape project' + (cs ? ' has-case' : '') + '">' +
      '<div class="shot" style="background:' + swatches[i % swatches.length] + '">' + shot + '</div>' +
      (p.type ? '<span class="type">' + esc(p.type) + '</span>' : '') +
      title +
      (p.blurb ? '<p class="blurb">' + esc(p.blurb) + '</p>' : '') +
      '<div class="project-foot">' + tryBtn + read + '</div>' +
    '</article>';
  }).join('');
})();
