/* System diagram: draws the hand-sketched arrows for any [data-sysmap] block,
   and opens each margin note when its box is clicked.
   Ink arrows connect the boxes; a red-pen arrow points from each open note to its box.
   On narrower screens open notes stack under the sketch and only the ink arrows show. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  // Which box connects to which: [from, fromSide, to, toSide, twoWay]
  var LINKS = [
    ['gh', 'bottom-left', 'qm', 'top', false],
    ['gh', 'bottom-right', 'pb', 'top', false],
    ['qm', 'right', 'fb', 'left', true],
    ['fb', 'right', 'pb', 'left', true],
    ['qm', 'bottom', 'cf', 'top', false],
    ['cf', 'right', 'cl', 'left', false]
  ];
  // Where each note's arrow lands on its box
  var NOTE_TARGET = { gh: 'left', qm: 'left', cf: 'left', fb: 'top-right', pb: 'right', cl: 'right' };

  function pt(r, side, gap) {
    gap = gap || 0;
    switch (side) {
      case 'top': return { x: r.cx, y: r.top - gap };
      case 'bottom': return { x: r.cx, y: r.bottom + gap };
      case 'left': return { x: r.left - gap, y: r.cy };
      case 'right': return { x: r.right + gap, y: r.cy };
      case 'bottom-left': return { x: r.left + r.w * 0.3, y: r.bottom + gap };
      case 'bottom-right': return { x: r.right - r.w * 0.3, y: r.bottom + gap };
      case 'top-right': return { x: r.right - Math.min(26, r.w * 0.2), y: r.top - gap };
    }
  }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function head(tip, from, cls, size) {
    var dx = tip.x - from.x, dy = tip.y - from.y, len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len, s = size || 9, w = s * 0.55;
    var a = { x: tip.x - ux * s - uy * w, y: tip.y - uy * s + ux * w };
    var b = { x: tip.x - ux * s + uy * w, y: tip.y - uy * s - ux * w };
    return el('path', { d: 'M' + a.x + ' ' + a.y + ' L' + tip.x + ' ' + tip.y + ' L' + b.x + ' ' + b.y, 'class': cls });
  }

  function curve(svg, s, c1, c2, e, cls, headCls, twoWay) {
    svg.appendChild(el('path', {
      d: 'M' + s.x + ' ' + s.y + ' C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + e.x + ' ' + e.y,
      'class': cls
    }));
    // Short links (phones) get smaller heads so a two-way arrow still shows its line
    var size = Math.max(5, Math.min(9, Math.hypot(e.x - s.x, e.y - s.y) / (twoWay ? 4 : 3)));
    svg.appendChild(head(e, c2, headCls, size));
    if (twoWay) svg.appendChild(head(s, c1, headCls, size));
  }

  function draw(map, freshId) {
    var svg = map.querySelector('.sys-arrows');
    var box = map.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    function rect(node) {
      var r = node.getBoundingClientRect();
      var o = { left: r.left - box.left, top: r.top - box.top, w: r.width, h: r.height };
      o.right = o.left + o.w; o.bottom = o.top + o.h; o.cx = o.left + o.w / 2; o.cy = o.top + o.h / 2;
      return o;
    }
    var nodes = {};
    map.querySelectorAll('[data-node]').forEach(function (n) { nodes[n.getAttribute('data-node')] = rect(n); });

    // Ink arrows between boxes
    LINKS.forEach(function (l) {
      var a = nodes[l[0]], b = nodes[l[2]];
      if (!a || !b) return;
      var s = pt(a, l[1], 6), e = pt(b, l[3], 6);
      var c1, c2;
      if (l[3] === 'top') {          // dropping down into a box
        c1 = { x: s.x, y: s.y + (e.y - s.y) * 0.55 };
        c2 = { x: e.x, y: e.y - (e.y - s.y) * 0.55 };
      } else {                       // side to side, with a slight bow
        var bow = (e.x - s.x) * 0.12;
        c1 = { x: s.x + (e.x - s.x) * 0.35, y: s.y - bow };
        c2 = { x: s.x + (e.x - s.x) * 0.65, y: e.y - bow };
      }
      curve(svg, s, c1, c2, e, 'link', 'head-ink', l[4]);
    });

    // Red-pen arrows from notes (wide screens only)
    if (window.matchMedia('(max-width: 1060px)').matches) return;
    map.querySelectorAll('.sys-note.is-open[data-for]').forEach(function (n) {
      var id = n.getAttribute('data-for'), target = nodes[id];
      if (!target) return;
      var fresh = id === freshId || freshId === '*' ? ' fresh' : '';
      var title = n.querySelector('h3') || n;
      var t = rect(title), nr = rect(n);
      var leftSide = !!n.closest('.sys-notes--left');
      var s = leftSide ? { x: nr.right + 10, y: t.cy } : { x: nr.left - 10, y: t.cy };
      var side = NOTE_TARGET[id] || (leftSide ? 'left' : 'right');
      var e = pt(target, side, 8);
      var c1 = { x: s.x + (e.x - s.x) * 0.5, y: s.y };
      var c2 = side === 'top-right'
        ? { x: e.x + 10, y: e.y - Math.max(30, (e.y - s.y) * 0.5) }
        : { x: e.x - (e.x - s.x) * 0.3, y: e.y - (e.y - s.y) * 0.15 };
      curve(svg, s, c1, c2, e, 'note-arrow' + fresh, 'head-red' + fresh, false);
    });
  }

  function init(map) {
    var redraw = function (freshId) { requestAnimationFrame(function () { draw(map, freshId); }); };
    var boxes = map.querySelectorAll('.sys-box[data-node]');
    var allBtn = map.parentNode.querySelector('[data-sys-all]');

    function setOpen(id, open) {
      var note = map.querySelector('.sys-note[data-for="' + id + '"]');
      var box = map.querySelector('.sys-box[data-node="' + id + '"]');
      if (note) note.classList.toggle('is-open', open);
      if (box) box.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function syncAll() {
      if (!allBtn) return;
      var allOpen = Array.prototype.every.call(boxes, function (b) { return b.getAttribute('aria-expanded') === 'true'; });
      allBtn.textContent = allOpen ? 'Close all' : 'Open all';
    }

    boxes.forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-node'), open = b.getAttribute('aria-expanded') !== 'true';
        setOpen(id, open);
        syncAll();
        redraw(open ? id : null);
        // On phones the note opens below the sketch, so bring it into view
        if (open && window.matchMedia('(max-width: 1060px)').matches) {
          var note = map.querySelector('.sys-note[data-for="' + id + '"]');
          if (note) note.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
    if (allBtn) allBtn.addEventListener('click', function () {
      var open = allBtn.textContent === 'Open all';
      boxes.forEach(function (b) { setOpen(b.getAttribute('data-node'), open); });
      syncAll();
      redraw(open ? '*' : null);
    });

    redraw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
    window.addEventListener('load', redraw);
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(map);
    else window.addEventListener('resize', redraw);
  }

  document.querySelectorAll('[data-sysmap]').forEach(init);
})();
