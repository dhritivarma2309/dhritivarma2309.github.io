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

  var slot = document.querySelector('[data-slot="projects"]');
  if (!slot) return;
  slot.innerHTML = (L.projects || []).map(function (p, i) {
    var cs = p.caseStudy;
    var title = '<h2 class="' + (isPh(p.title) ? 'placeholder' : '') + '">' +
      (cs ? '<a class="card-link" href="' + esc(cs) + '">' + esc(p.title) + '</a>' : esc(p.title)) + '</h2>';
    var shot = p.image
      ? '<img src="' + esc(p.image) + '" alt="Screenshot of ' + esc(p.title) + '" loading="lazy">'
      : '<span class="shot-label">Screenshot</span>';
    var tryBtn = p.tryUrl
      ? '<a class="btn btn--solid btn--sm try" href="' + esc(p.tryUrl) + '" target="_blank" rel="noopener">Try it ' + ARROW + '</a>'
      : '<span class="btn btn--solid btn--sm try" aria-disabled="true" title="Add a link in data/lab.js">Try it ' + ARROW + '</span>';
    var read = cs ? '<span class="read">Read the case study →</span>' : '<span class="soon">case study coming soon</span>';
    return '<article class="paper tape project' + (cs ? ' has-case' : '') + '">' +
      '<div class="shot" style="background:' + swatches[i % swatches.length] + '">' + shot + '</div>' +
      (p.type ? '<span class="type">' + esc(p.type) + '</span>' : '') +
      title +
      '<div class="project-foot">' + tryBtn + read + '</div>' +
    '</article>';
  }).join('');
})();
